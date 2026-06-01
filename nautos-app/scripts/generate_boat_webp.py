from PIL import Image, ImageDraw

img = Image.new('RGB', (1200, 600), (4, 24, 46))
d = ImageDraw.Draw(img)
points = [(160, 400), (260, 320), (580, 320), (700, 400)]
d.polygon(points, fill=(29, 78, 216))
d.rectangle([260, 200, 580, 310], fill=(147, 197, 253))
d.rectangle([330, 160, 510, 200], fill=(224, 231, 255))
d.rectangle([420, 90, 450, 200], fill=(255, 255, 255))
for i in range(5):
    d.line([(100 + 140 * i, 430), (120 + 140 * i, 440)], fill=(169, 216, 255), width=6)
    d.line([(120 + 140 * i, 440), (140 + 140 * i, 428)], fill=(169, 216, 255), width=4)
img.save('nautos-app/public/boat.webp', 'WEBP', quality=90)
print('boat.webp created')
