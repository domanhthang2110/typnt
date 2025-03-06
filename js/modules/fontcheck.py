import json
import requests
import os

def check_google_fonts(json_path='../../data/fontinfo.json', api_key='AIzaSyBJr2Qgi8BBZ0eAMid_JNP96o7Pp328cYY'):
    """
    Check if fonts from fontinfo.json exist on Google Fonts
    """
    # Load font data from JSON file
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            font_data = json.load(f)
        print(f"Loaded {len(font_data)} fonts from {json_path}")
    except Exception as e:
        print(f"Error loading font data from {json_path}: {e}")
        return
    
    # Get all available Google Fonts
    google_fonts_url = f"https://www.googleapis.com/webfonts/v1/webfonts?key={api_key}"
    try:
        response = requests.get(google_fonts_url)
        response.raise_for_status()
        google_fonts_data = response.json()
        google_fonts = {font['family']: font for font in google_fonts_data['items']}
        print(f"Found {len(google_fonts)} fonts from Google Fonts API")
    except Exception as e:
        print(f"Error fetching Google Fonts: {e}")
        return
    
    # Check each font in fontinfo.json
    fonts_not_found = []
    for font in font_data:
        font_name = font.get('name')
        if not font_name:
            print(f"Warning: Font with no name found in data")
            continue
            
        if font_name not in google_fonts:
            fonts_not_found.append(font_name)
            print(f"❌ Font not found on Google Fonts: {font_name}")
    
    # Prompt to delete fonts not found
    if fonts_not_found:
        print(f"\nFound {len(fonts_not_found)} fonts that don't exist on Google Fonts:")
        for i, font_name in enumerate(fonts_not_found, 1):
            print(f"{i}. {font_name}")
        
        response = input("\nDo you want to delete these fonts from fontinfo.json? (y/n): ")
        if response.lower() == 'y':
            # Create new font list without the missing fonts
            new_font_data = [font for font in font_data if font.get('name') not in fonts_not_found]
            
            # Backup original file
            backup_path = json_path + '.backup'
            try:
                with open(backup_path, 'w', encoding='utf-8') as f:
                    json.dump(font_data, f, ensure_ascii=False, indent=2)
                print(f"Created backup at {backup_path}")
            except Exception as e:
                print(f"Error creating backup: {e}")
                return
            
            # Write new data
            try:
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(new_font_data, f, ensure_ascii=False, indent=2)
                print(f"Successfully removed {len(fonts_not_found)} fonts from {json_path}")
            except Exception as e:
                print(f"Error writing updated font data: {e}")
    else:
        print("\n✅ All fonts in fontinfo.json exist on Google Fonts!")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, '..', '..', 'data', 'fontinfo.json')
    check_google_fonts(json_path)