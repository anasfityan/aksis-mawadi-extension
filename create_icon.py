from PIL import Image, ImageDraw, ImageFont
import os

img = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
draw.rounded_rectangle([0, 0, 47, 47], radius=12, fill=(155, 130, 219))
draw.text((24, 24), "م", fill="white", anchor="mm")
img.save("icon.png")
print("Icon created")
