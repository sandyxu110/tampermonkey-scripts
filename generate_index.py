from pathlib import Path
import subprocess
import html

cards = []

for f in sorted(Path(".").glob("*.user.js")):

    name = f.stem
    desc = ""
    version = ""

    with open(f, encoding="utf-8") as fp:
        for line in fp:
            line = line.strip()

            if line.startswith("// @name"):
                name = line.split(None, 2)[2]

            elif line.startswith("// @description"):
                desc = line.split(None, 2)[2]

            elif line.startswith("// @version"):
                version = line.split(None, 2)[2]

    try:
        update = subprocess.check_output([
            "git",
            "log",
            "-1",
            "--format=%cs %H",
            "--",
            str(f)
        ]).decode().strip().split()[0]
    except:
        update = "-"

    cards.append(f"""
<div class="card">
<h2>{html.escape(name)}</h2>

<p>{html.escape(desc)}</p>

<div class="info">
<span>🏷️ {version}</span>
<span>📅 {update}</span>
</div>

<a class="btn" href="{f.name}">
🚀 Install
</a>

</div>
""")

html_text = f"""<!DOCTYPE html>

<html>

<head>

<meta charset="utf-8">

<title>Tampermonkey Scripts</title>

<style>

body{{
max-width:900px;
margin:40px auto;
padding:20px;
font-family:system-ui;
background:#f5f7fa;
}}

h1{{
text-align:center;
}}

.card{{
background:white;
padding:20px;
margin:20px 0;
border-radius:12px;
box-shadow:0 2px 8px rgba(0,0,0,.08);
}}

.info{{
margin:12px 0;
color:#666;
display:flex;
gap:20px;
}}

.btn{{
display:inline-block;
background:#0d6efd;
color:white;
padding:10px 18px;
border-radius:8px;
text-decoration:none;
}}

.btn:hover{{
background:#0958d9;
}}

@media(prefers-color-scheme:dark){{
body{{background:#111;color:#eee;}}
.card{{background:#1e1e1e;}}
.info{{color:#bbb;}}
}}

</style>

</head>

<body>

<h1>📜 Tampermonkey Scripts</h1>

{"".join(cards)}

</body>

</html>
"""

Path("index.html").write_text(html_text,encoding="utf-8")
