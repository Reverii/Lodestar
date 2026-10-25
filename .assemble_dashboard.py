import base64, json, os, re, sys
# --release: build without dev mode (strips the /*DEV*/ ... /*/DEV*/ and <!--DEV--> ... <!--/DEV--> blocks)
REL = '--release' in sys.argv
if REL: sys.argv.remove('--release')
# usage: assemble.py <own sample xlsx> <out.html> [other sample xlsx ...]
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app.html')).read()
ff = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'package/umd/index.js')).read()
assert '</script' not in ff
lic = "/*! fflate v0.8.2 | MIT License | Copyright (c) 2023 Arjun Barrett | https://github.com/101arrowz/fflate */\n"
b64 = lambda p: base64.b64encode(open(p, 'rb').read()).decode()
others = {os.path.basename(p): b64(p) for p in sys.argv[3:]}
if REL:
    src = re.sub(r'/\*DEV\*/.*?/\*/DEV\*/', '', src, flags=re.S)
    src = re.sub(r'<!--DEV-->.*?<!--/DEV-->', '', src, flags=re.S)
    assert 'DEV_BUILD' not in src and 'devBadge' not in src
out = src.replace('/*FFLATE*/', lic + ff).replace('/*TEMPLATE*/', b64(sys.argv[1]))
out = out.replace('<script>const TEMPLATE_B64', '<script>const SAMPLES_B64 = ' + json.dumps(others) + ';</script>\n<script>const TEMPLATE_B64', 1)
open(sys.argv[2], 'w').write(out)
print(len(out))
