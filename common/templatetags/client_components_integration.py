import json
import os
from django import template
from django.conf import settings
from django.utils.safestring import mark_safe

register = template.Library()

CLIENT_COMPONENT_SETTINGS = getattr(settings, "CLIENT_COMPONENT_SETTINGS", {})


# todo: add debug mode handling
@register.simple_tag
def load_client_components():
    """Load JS & CSS assets dynamically, supporting both Apache and Django static files."""

    client_components_static_url = getattr(settings, "STATIC_URL", "static/")
    manifest_path = CLIENT_COMPONENT_SETTINGS.get(
        "MANIFEST_FILE_PATH", ".vite/manifest.json"
    )
    # TODO: REMOVE THIS DANGEROUS ERROR HANDLING, ADD A PROPER ONE
    if not os.path.exists(manifest_path):
        print("manifest path does not exist")
        return
    #     return f"{{ <!-- Vite manifest.json not found in static files -->|safe }} "
    manifest = {}

    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

    except Exception as e:
        print("error", e)

        pass
        # TODO: REMOVE THIS DANGEROUS ERROR HANDLING, ADD A PROPER ONE
        # return f"<!-- Error loading Vite manifest.json: {str(e)} -->"

    # TODO: add come parsing to manifest
    # if entry_name not in manifest:
    #     return f"<!-- Entry '{entry_name}' not found in Vite manifest.json -->"

    js_files = {k: v for k, v in manifest.items() if k.endswith(".js")}
    css_files = {k: v for k, v in manifest.items() if k.endswith(".css")}

    tags = []

    for file in js_files.values():
        tags.append(
            f'<script type="module" src="{client_components_static_url}{file['file']}"></script>'
        )

    for file in css_files.values():
        tags.append(
            f'<link rel="stylesheet" href="{client_components_static_url}{file['file']}">'
        )

    return mark_safe("\n".join(tags))
