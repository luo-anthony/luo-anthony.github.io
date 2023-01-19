from PIL import Image
from os import listdir
from os.path import isfile, join

# https://stackoverflow.com/questions/61201141/how-can-i-crop-an-image-with-11-aspect-ratio-using-pillow-in-python

def crop_image_square(image):
    width, height = image.size
    if width == height:
        return image
    offset  = int(abs(height-width)/2)
    if width>height:
        image = image.crop([offset,0,width-offset,height])
    else:
        image = image.crop([0,offset,width,height-offset])
    return image

ratio = 1.345
def crop_image_top_ratio(image):
    width, height = image.size
    newHeight = int(ratio * width)
    image = image.crop([0,height - newHeight,width,height])
    return image 


img_path = "/Users/anthonyluo/Documents/WebsiteFullPictures/square"
output_path = "images/food"
files = [f for f in listdir(img_path) if isfile(join(img_path, f))]
dimension = 800

cropFunction = crop_image_square

print(files)
for f in files:
    if(".DS_Store" in f):
        continue
    image = Image.open(join(img_path, f))
    image = cropFunction(image)
    width, height = image.size
    image = image.resize((dimension,int(dimension * (height/width))))
    image.save(f'{output_path}/{f}', optimize=True, quality=90)  



