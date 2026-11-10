import os
from PIL import Image, ImageDraw

def draw_texugo_head(size=512):
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    scale = size / 512.0

    def pt(x, y):
        return (x * scale, y * scale)

    def pts(coords):
        return [pt(x, y) for x, y in coords]

    # Background rounded container / shield (sleek dark hexagon or rounded squircle)
    # Background circle/squircle
    margin = 16 * scale
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=90 * scale,
        fill=(18, 22, 31, 255),
        outline=(61, 214, 198, 220), # Cyan neon border
        width=int(10 * scale)
    )

    # Subtle inner glow / gradient ring
    draw.rounded_rectangle(
        [margin + 6*scale, margin + 6*scale, size - margin - 6*scale, size - margin - 6*scale],
        radius=84 * scale,
        outline=(32, 201, 151, 80),
        width=int(4 * scale)
    )

    # 1. Ears
    # Left Ear (outer dark, inner white/cyan tip)
    draw.polygon(pts([(120, 160), (90, 80), (180, 120)]), fill=(28, 34, 46, 255))
    draw.polygon(pts([(115, 145), (100, 95), (160, 125)]), fill=(225, 228, 234, 255))
    draw.polygon(pts([(120, 135), (110, 105), (150, 125)]), fill=(61, 214, 198, 200))

    # Right Ear
    draw.polygon(pts([(512 - 120, 160), (512 - 90, 80), (512 - 180, 120)]), fill=(28, 34, 46, 255))
    draw.polygon(pts([(512 - 115, 145), (512 - 100, 95), (512 - 160, 125)]), fill=(225, 228, 234, 255))
    draw.polygon(pts([(512 - 120, 135), (512 - 110, 105), (512 - 150, 125)]), fill=(61, 214, 198, 200))

    # 2. Main Head Base (white cheeks and jaw)
    head_base = pts([
        (256, 120),  # top crown
        (350, 170),
        (390, 260),  # right cheek wide
        (360, 360),  # right jaw
        (280, 420),  # right chin
        (256, 430),  # chin tip
        (180, 420),  # left chin
        (152, 360),  # left jaw
        (122, 260),  # left cheek wide
        (162, 170),
    ])
    draw.polygon(head_base, fill=(240, 244, 248, 255)) # Pure clean texugo white/silver

    # 3. Two Iconic Dark Stripes (Eye bands)
    # Left dark band
    left_band = pts([
        (230, 125),
        (200, 135),
        (140, 240),
        (160, 320),
        (225, 330),
        (225, 230),
    ])
    draw.polygon(left_band, fill=(24, 29, 39, 255))

    # Right dark band
    right_band = pts([
        (512 - 230, 125),
        (512 - 200, 135),
        (512 - 140, 240),
        (512 - 160, 320),
        (512 - 225, 330),
        (512 - 225, 230),
    ])
    draw.polygon(right_band, fill=(24, 29, 39, 255))

    # 4. Center Bold White Stripe (defining the Badger forehead to snout)
    center_stripe = pts([
        (256, 115),
        (226, 130),
        (220, 220),
        (215, 330),
        (235, 380),
        (256, 385),
        (277, 380),
        (297, 330),
        (292, 220),
        (286, 130),
    ])
    draw.polygon(center_stripe, fill=(255, 255, 255, 255))

    # 5. Glowing AI / Tech Eyes
    # Left eye (sharp angled cyan glow)
    draw.polygon(pts([(170, 245), (210, 235), (205, 255), (175, 260)]), fill=(61, 214, 198, 255))
    draw.polygon(pts([(185, 242), (205, 238), (200, 250), (188, 252)]), fill=(255, 255, 255, 255)) # highlight

    # Right eye
    draw.polygon(pts([(512 - 170, 245), (512 - 210, 235), (512 - 205, 255), (512 - 175, 260)]), fill=(61, 214, 198, 255))
    draw.polygon(pts([(512 - 185, 242), (512 - 205, 238), (512 - 200, 250), (512 - 188, 252)]), fill=(255, 255, 255, 255))

    # 6. Snout & Nose
    # Muzzle shadow/accent
    draw.polygon(pts([(235, 370), (256, 360), (277, 370), (285, 410), (256, 425), (227, 410)]), fill=(225, 230, 238, 255))

    # Black Nose (triangular)
    nose = pts([
        (232, 372),
        (280, 372),
        (268, 395),
        (256, 402),
        (244, 395),
    ])
    draw.polygon(nose, fill=(18, 22, 31, 255))
    # Nose cyan highlight line
    draw.line([pt(242, 375), pt(270, 375)], fill=(61, 214, 198, 255), width=int(3 * scale))

    # Mouth line
    draw.line([pt(256, 402), pt(256, 416)], fill=(18, 22, 31, 255), width=int(3 * scale))
    draw.line([pt(244, 416), pt(268, 416)], fill=(18, 22, 31, 255), width=int(3 * scale))

    # Tech accents: small glowing cheek marks
    draw.line([pt(135, 290), pt(150, 310)], fill=(61, 214, 198, 180), width=int(3 * scale))
    draw.line([pt(512 - 135, 290), pt(512 - 150, 310)], fill=(61, 214, 198, 180), width=int(3 * scale))

    return img

if __name__ == '__main__':
    img512 = draw_texugo_head(512)
    os.makedirs('build', exist_ok=True)
    img512.save('build/icon.png', 'PNG')
    print('Generated build/icon.png')

    # Multi-resolution ICO
    sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    img512.save('build/icon.ico', format='ICO', sizes=sizes)
    print('Generated build/icon.ico')
