"""
Birthday Surprise - a slide-by-slide birthday gift web experience.

Routes
  /            -> the default gift (data/default_gift.json)
  /g/<id>      -> a gift made with the builder
  /create      -> builder form (name, date, message, photos, theme)
  /u/<id>/<f>  -> uploaded photos of a built gift
  /healthz     -> health check for the host
"""
import json
import os
import re
import uuid

from flask import (Flask, abort, jsonify, redirect, render_template, request,
                   send_from_directory, url_for)
from werkzeug.utils import secure_filename

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(BASE_DIR, "data"))
GIFT_DIR = os.path.join(DATA_DIR, "gifts")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
DEFAULT_FILE = os.path.join(BASE_DIR, "data", "default_gift.json")
PHOTO_DIR = os.path.join(BASE_DIR, "static", "photos")

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
THEMES = ("pastel", "rose", "midnight")
MAX_PHOTOS = 6

for d in (GIFT_DIR, UPLOAD_DIR):
    os.makedirs(d, exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 40 * 1024 * 1024  # 40 MB per request
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "change-me")

FALLBACK_GIFT = {
    "name": "Chitti",
    "date": "04 November",
    "sender": "Someone Special",
    "theme": "pastel",
    "message": [
        "Happy birthday, you Beautiful Girl.",
        "I wanted to make you something that felt a little like you - warm, a bit silly, and full of tiny surprises.",
        "Thank you for every late-night talk, every ridiculous inside joke, every time you showed up without being asked.",
        "This year, I hope you get the slow mornings, the loud laughs, the good news you've been waiting for, and at least one perfect slice of cake.",
        "Happy birthday. Today is all yours.",
    ],
    "photos": [],
}


def load_default():
    try:
        with open(DEFAULT_FILE, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return dict(FALLBACK_GIFT)


def normalise(raw, base_url_for_file):
    """Return a clean, safe gift dict the front-end can use."""
    g = dict(FALLBACK_GIFT)
    g.update({k: v for k, v in (raw or {}).items() if v not in (None, "")})
    g["name"] = str(g["name"]).strip()[:40] or "Friend"
    g["date"] = str(g.get("date", "")).strip()[:30]
    g["sender"] = str(g.get("sender", "")).strip()[:40] or "Someone Special"
    if g.get("theme") not in THEMES:
        g["theme"] = "pastel"
    msg = g.get("message") or FALLBACK_GIFT["message"]
    if isinstance(msg, str):
        msg = [p.strip() for p in re.split(r"\n\s*\n|\r\n\s*\r\n", msg) if p.strip()]
    g["message"] = [str(p)[:700] for p in msg][:10]

    photos = []
    for p in (g.get("photos") or [])[:MAX_PHOTOS]:
        if isinstance(p, str):
            p = {"file": p, "caption": ""}
        src = base_url_for_file(p)
        if src:
            photos.append({"src": src, "caption": str(p.get("caption", ""))[:40]})
    g["photos"] = photos
    return g


def default_photo_url(p):
    fname = secure_filename(p.get("file", ""))
    if fname and os.path.exists(os.path.join(PHOTO_DIR, fname)):
        return url_for("static", filename="photos/" + fname)
    return None


def music_url():
    for ext in ("mp3", "ogg", "m4a", "wav"):
        if os.path.exists(os.path.join(BASE_DIR, "static", "audio", "music." + ext)):
            return url_for("static", filename="audio/music." + ext)
    return ""


def render_gift(gift):
    return render_template("index.html", gift=gift, music=music_url())


@app.route("/")
def home():
    gift = normalise(load_default(), default_photo_url)
    # quick personalisation by link: /?name=Riya&from=Sam&date=3%20May
    if request.args.get("name"):
        gift["name"] = request.args["name"].strip()[:40]
    if request.args.get("from"):
        gift["sender"] = request.args["from"].strip()[:40]
    if request.args.get("date"):
        gift["date"] = request.args["date"].strip()[:30]
    if request.args.get("theme") in THEMES:
        gift["theme"] = request.args["theme"]
    return render_gift(gift)


@app.route("/g/<gid>")
def gift_page(gid):
    if not re.fullmatch(r"[a-f0-9]{10}", gid):
        abort(404)
    path = os.path.join(GIFT_DIR, gid + ".json")
    if not os.path.exists(path):
        abort(404)
    with open(path, "r", encoding="utf-8") as fh:
        raw = json.load(fh)

    def up_url(p):
        f = secure_filename(p.get("file", ""))
        if f and os.path.exists(os.path.join(UPLOAD_DIR, gid, f)):
            return url_for("uploaded", gid=gid, filename=f)
        return None

    return render_gift(normalise(raw, up_url))


@app.route("/u/<gid>/<path:filename>")
def uploaded(gid, filename):
    if not re.fullmatch(r"[a-f0-9]{10}", gid):
        abort(404)
    return send_from_directory(os.path.join(UPLOAD_DIR, gid), filename)


def save_image(file_storage, dest_dir):
    """Save an uploaded image, shrinking it so the gift loads fast."""
    ext = os.path.splitext(file_storage.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        return None
    name = uuid.uuid4().hex[:12] + (".jpg" if ext in (".jpeg", ".jpg") else ext)
    path = os.path.join(dest_dir, name)
    try:
        from PIL import Image, ImageOps
        img = Image.open(file_storage.stream)
        img = ImageOps.exif_transpose(img)
        img.thumbnail((1200, 1200))
        if name.endswith(".jpg"):
            img = img.convert("RGB")
            img.save(path, "JPEG", quality=84, optimize=True)
        else:
            img.save(path)
    except Exception:
        file_storage.stream.seek(0)
        file_storage.save(path)
    return name


@app.route("/create", methods=["GET", "POST"])
def create():
    key_required = os.environ.get("CREATE_KEY", "")
    if request.method == "GET":
        return render_template("create.html", themes=THEMES, key_required=bool(key_required), error=None)

    if key_required and request.form.get("key", "") != key_required:
        return render_template("create.html", themes=THEMES, key_required=True,
                               error="Wrong creator key."), 403

    gid = uuid.uuid4().hex[:10]
    dest = os.path.join(UPLOAD_DIR, gid)
    os.makedirs(dest, exist_ok=True)

    photos = []
    files = request.files.getlist("photos")
    captions = request.form.getlist("captions")
    for i, f in enumerate(files[:MAX_PHOTOS]):
        if not f or not f.filename:
            continue
        saved = save_image(f, dest)
        if saved:
            cap = captions[i] if i < len(captions) else ""
            photos.append({"file": saved, "caption": cap.strip()[:40]})

    gift = {
        "name": request.form.get("name", "").strip(),
        "date": request.form.get("date", "").strip(),
        "sender": request.form.get("sender", "").strip(),
        "theme": request.form.get("theme", "pastel"),
        "message": request.form.get("message", "").strip(),
        "photos": photos,
    }
    with open(os.path.join(GIFT_DIR, gid + ".json"), "w", encoding="utf-8") as fh:
        json.dump(gift, fh, ensure_ascii=False, indent=2)
    return redirect(url_for("created", gid=gid))


@app.route("/created/<gid>")
def created(gid):
    if not re.fullmatch(r"[a-f0-9]{10}", gid):
        abort(404)
    link = url_for("gift_page", gid=gid, _external=True)
    return render_template("created.html", link=link, gid=gid)


@app.route("/healthz")
def healthz():
    return jsonify(status="ok")


@app.errorhandler(404)
def not_found(_e):
    return render_template("created.html", link=None, gid=None), 404


@app.errorhandler(413)
def too_big(_e):
    return "Photos are too large (max 40 MB in total). Please upload smaller photos.", 413


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
