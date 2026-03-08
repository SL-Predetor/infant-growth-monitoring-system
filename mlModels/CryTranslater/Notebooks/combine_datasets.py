import os
import shutil
import uuid
from tqdm import tqdm  # pip install tqdm

# --- CONFIGURATION ---
# Update these paths to match your exact folder location!
# Using paths relative to this script's location
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PATH_NUMERIC = os.path.join(SCRIPT_DIR, "..", "data", "raw", "img", "Pain Level")
PATH_TEXT    = os.path.join(SCRIPT_DIR, "..", "data", "raw", "img", "Zenodo dataset")

# Where to save the new combined Super-Dataset
DEST_DIR = os.path.join(SCRIPT_DIR, "..", "data", "raw", "img", "Combined dataset")

def get_target_label(folder_name):
    """
    Decides if a folder belongs to 'Pain' or 'No_Pain'.
    """
    folder_clean = str(folder_name).strip().lower()

    # --- CHECK 1: Is it a Number? (Dataset 1) ---
    try:
        val = float(folder_clean)
        if val == 0:
            return "No_Pain"  # 0 means no pain
        elif val > 0:
            return "Pain"     # 0.5, 1, 8, etc. are all Pain
    except ValueError:
        pass  # Not a number, check text below

    # --- CHECK 2: Is it Text? (Dataset 2) ---
    if "no_pain" in folder_clean:
        return "No_Pain"
    elif folder_clean in ["mild", "moderate", "severe"]:
        return "Pain"
    
    return None  # Skip unknown folders (e.g., 'splitted')

def copy_images(source_root, dataset_prefix):
    if not os.path.exists(source_root):
        print(f"⚠️ Warning: Source path not found: {source_root}")
        return

    print(f"🚀 Processing dataset: {dataset_prefix}...")
    
    # Walk through every folder in the source
    for root, dirs, files in os.walk(source_root):
        folder_name = os.path.basename(root)
        
        # Determine label (Pain or No_Pain)
        target_label = get_target_label(folder_name)
        
        if target_label:
            # Create destination folder (e.g., ../Combined_Faces/Pain)
            dest_folder = os.path.join(DEST_DIR, target_label)
            os.makedirs(dest_folder, exist_ok=True)
            
            # Copy every image file
            for file in tqdm(files, desc=f"  Copying {folder_name}", leave=False):
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp')):
                    src_path = os.path.join(root, file)
                    
                    # Create a unique name so files don't overwrite each other
                    # e.g. "Numeric_Pain_a1b2c3d4.jpg"
                    unique_name = f"{dataset_prefix}_{target_label}_{uuid.uuid4().hex[:8]}.jpg"
                    dest_path = os.path.join(dest_folder, unique_name)
                    
                    shutil.copy2(src_path, dest_path)

if __name__ == "__main__":
    # 1. Clean old data if it exists (Fresh Start)
    if os.path.exists(DEST_DIR):
        print(f"🧹 Cleaning old folder: {DEST_DIR}")
        shutil.rmtree(DEST_DIR)
    
    # 2. Run the copy process
    copy_images(PATH_NUMERIC, "Numeric")
    copy_images(PATH_TEXT,    "Zenodo")
    
    # 3. Print Stats
    print("\n✅ MERGE COMPLETE!")
    
    if os.path.exists(DEST_DIR):
        pain_count = len(os.listdir(os.path.join(DEST_DIR, "Pain")))
        nopain_count = len(os.listdir(os.path.join(DEST_DIR, "No_Pain")))
        total = pain_count + nopain_count
        
        print(f"📂 Output Folder: {os.path.abspath(DEST_DIR)}")
        print(f"📊 Total Images: {total}")
        print(f"   🔴 Pain:    {pain_count}")
        print(f"   🟢 No Pain: {nopain_count}")
    else:
        print("❌ Error: Output folder was not created. Check your source paths!")