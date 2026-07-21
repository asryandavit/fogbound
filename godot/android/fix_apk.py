#!/usr/bin/env python3
"""Fix duplicate ZIP entries in Godot Android APK.

Two problems:
1. Duplicate .so files — keep the entry with the largest uncompressed size.
2. Gradle intermediate entries under assets/android/ — these are build artifacts
   that Godot mistakenly picks up as res:// paths, causing GDExtensions to be
   loaded multiple times and corrupting their C++ internal state.

Reads by ZipInfo object (not name) to avoid Python's last-entry-wins behaviour.
.so files must be STORED (compress_type=0) for Android to mmap them directly.
"""
import zipfile, sys, os, io

src = sys.argv[1]
dst = sys.argv[2]

def is_gradle_intermediate(name):
    """Return True for build-artifact paths that should not be in the final APK."""
    return name.startswith("assets/android/")

# Pass 1: for each name, pick the ZipInfo with the highest file_size
best = {}  # name -> ZipInfo
skipped_intermediate = []
with zipfile.ZipFile(src, 'r') as z:
    for info in z.infolist():
        if is_gradle_intermediate(info.filename):
            skipped_intermediate.append(info.filename)
            continue
        prev = best.get(info.filename)
        if prev is None or info.file_size > prev.file_size:
            best[info.filename] = info

print(f"Skipping {len(skipped_intermediate)} Gradle intermediate entries under assets/android/")

# Pass 2: copy entries, reading via the chosen ZipInfo object
tmp = dst + ".tmp"
with zipfile.ZipFile(src, 'r') as zin:
    with zipfile.ZipFile(tmp, 'w') as zout:
        for info in best.values():
            with zin.open(info) as fh:  # open by ZipInfo — reads the right entry
                data = fh.read()
            # .so files must be STORED for Android direct mmap; everything else keep original
            if info.filename.endswith('.so'):
                zout.writestr(info.filename, data, compress_type=zipfile.ZIP_STORED)
            else:
                zout.writestr(info, data)

os.replace(tmp, dst)

# Verify
with zipfile.ZipFile(dst, 'r') as z:
    entries = z.infolist()
    so_entries = [e for e in entries if e.filename.endswith('.so')]
    gdext_entries = [e for e in entries if e.filename.endswith('.gdextension')]
    android_entries = [e for e in entries if e.filename.startswith('assets/android/')]
    print(f"Fixed APK: {len(entries)} total entries, {len(so_entries)} .so files, {len(gdext_entries)} .gdextension files")
    print(f"Remaining assets/android/ entries: {len(android_entries)} (should be 0)")
    for e in gdext_entries:
        print(f"  gdextension: {e.filename}")
    for e in so_entries:
        print(f"  {e.filename}: file_size={e.file_size} compress_type={e.compress_type}")
