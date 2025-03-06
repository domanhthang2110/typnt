import json
import os

def update_fontinfo(fonts_json_path, fontinfo_json_path, output_json_path):
    # Load fonts data from fonts.json
    try:
        with open(fonts_json_path, 'r', encoding='utf-8') as f:
            fonts_data = json.load(f)
        print(f"Loaded {len(fonts_data['items'])} fonts from {fonts_json_path}")
    except Exception as e:
        print(f"Error loading fonts data from {fonts_json_path}: {e}")
        return
    
    # Load fontinfo data from fontinfo.json
    try:
        with open(fontinfo_json_path, 'r', encoding='utf-8') as f:
            fontinfo_data = json.load(f)
        print(f"Loaded {len(fontinfo_data)} fonts from {fontinfo_json_path}")
    except Exception as e:
        print(f"Error loading fontinfo data from {fontinfo_json_path}: {e}")
        return
    
    # Create a dictionary for quick lookup of fonts by family name
    fonts_dict = {font['family']: font for font in fonts_data['items']}
    
    # Update fontinfo data with files from fonts data
    updated_count = 0
    for font in fontinfo_data:
        font_name = font.get('name')
        if font_name in fonts_dict:
            font['files'] = fonts_dict[font_name].get('files', {})
            updated_count += 1
    
    # Save the updated fontinfo data to a new JSON file
    try:
        with open(output_json_path, 'w', encoding='utf-8') as f:
            json.dump(fontinfo_data, f, ensure_ascii=False, indent=2)
        print(f"Successfully updated {updated_count} fonts and saved to {output_json_path}")
    except Exception as e:
        print(f"Error saving updated fontinfo data to {output_json_path}: {e}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    fonts_json_path = os.path.join(script_dir, 'fonts.json')
    fontinfo_json_path = os.path.join(script_dir, 'fontinfo.json')
    output_json_path = os.path.join(script_dir, 'fontinfo_updated.json')
    
    update_fontinfo(fonts_json_path, fontinfo_json_path, output_json_path)