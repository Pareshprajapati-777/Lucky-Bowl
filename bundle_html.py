import os
import json
import re

def get_standalone_html(names=None, trigger_draw=False):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(base_dir, "dist")
    assets_dir = os.path.join(dist_dir, "assets")

    if not os.path.exists(dist_dir) or not os.path.exists(assets_dir):
        raise FileNotFoundError("Distribution directory 'dist' or 'dist/assets' not found. Run npm run build first.")

    with open(os.path.join(dist_dir, "index.html"), "r", encoding="utf-8") as f:
        html = f.read()

    # Find latest CSS and JS files in assets
    css_files = sorted([f for f in os.listdir(assets_dir) if f.endswith(".css")], 
                       key=lambda f: os.path.getmtime(os.path.join(assets_dir, f)), reverse=True)
    js_files = sorted([f for f in os.listdir(assets_dir) if f.endswith(".js")], 
                      key=lambda f: os.path.getmtime(os.path.join(assets_dir, f)), reverse=True)

    if not css_files or not js_files:
        raise FileNotFoundError("Could not find bundled CSS or JS files in dist/assets")

    css_path = os.path.join(assets_dir, css_files[0])
    js_path = os.path.join(assets_dir, js_files[0])

    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()

    with open(js_path, "r", encoding="utf-8") as f:
        js = f.read()

    # Prepare injected script for Streamlit data communication
    names_injection = ""
    if names is not None and isinstance(names, list) and len(names) > 0:
        clean_names = [str(n).strip() for n in names if str(n).strip()]
        names_json = json.dumps(clean_names)
        names_injection = f"""
        <script>
          window.__STREAMLIT_NAMES__ = {names_json};
          try {{
            localStorage.setItem('spin_luck_names', JSON.stringify(window.__STREAMLIT_NAMES__));
          }} catch(e) {{}}
        </script>
        """

    auto_draw_injection = ""
    if trigger_draw:
        auto_draw_injection = """
        <script>
          window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
              if (window.spinLuckApp) {
                window.spinLuckApp.drawLuckyChit();
              }
            }, 800);
          });
        </script>
        """

    # Inline CSS into <style>
    html = re.sub(r'<link\s+rel="stylesheet"[^>]+>', lambda m: f'<style>\n{css}\n</style>', html)

    # Inline JS and pre-insert names injection
    replacement_js = f"""{names_injection}
{auto_draw_injection}
<script type="module">
{js}
</script>"""

    html = re.sub(r'<script\s+type="module"[^>]+src="[^"]+"[^>]*></script>', lambda m: replacement_js, html)

    return html

if __name__ == "__main__":
    content = get_standalone_html(names=["Paresh", "Deepak", "Meet", "Pritam", "Krish", "Kajal", "Trisha", "Khushi"])
    with open("standalone.html", "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Generated standalone.html: {len(content)} bytes")
