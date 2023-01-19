from PIL import Image
from os import listdir
from os.path import isfile, join

# https://stackoverflow.com/questions/61201141/how-can-i-crop-an-image-with-11-aspect-ratio-using-pillow-in-python

def crop_image(image):
    width, height = image.size
    if width == height:
        return image
    offset  = int(abs(height-width)/2)
    if width>height:
        image = image.crop([offset,0,width-offset,height])
    else:
        image = image.crop([0,offset,width,height-offset])
    return image

img_path = "/Users/anthonyluo/Documents/WebsiteFullPictures/nocrop"
output_path = "images/food"
onlyfiles = [f for f in listdir(img_path) if isfile(join(img_path, f))]
dimension = 1000

crop = False 

print(onlyfiles)
for f in onlyfiles:
    image = Image.open(join(img_path, f))
    if(crop):
        image = crop_image(image)
    width, height = image.size
    image = image.resize((dimension,int(dimension * (height/width))))
    image.save(f'{output_path}/{f}', optimize=True, quality=90)  



