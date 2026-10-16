import io
from PIL import Image, ImageDraw

# Literal display strokes, independent of the production classifier.
STROKES = {
    '0':'abcdef', '1':'bc', '2':'abdeg', '3':'abcdg', '4':'bcfg',
    '5':'acdfg', '6':'acdefg', '7':'abc', '8':'abcdefg', '9':'abcdfg', '-':'g',
}


def seven_segment(text='12.70', led=False):
    source = Image.new('RGB', (len(text)*64+32, 136), '#101810' if led else '#bdc9c4')
    draw = ImageDraw.Draw(source)
    fill = '#94ff3c' if led else '#121d1a'
    shapes = {'a':(8,0,40,8),'b':(40,7,48,48),'c':(40,48,48,88),
              'd':(8,88,40,96),'e':(0,48,8,88),'f':(0,7,8,48),'g':(8,44,40,52)}
    x = 16
    for char in text:
        if char=='.':
            draw.ellipse((x,106,x+7,113), fill=fill); x += 16
        else:
            for segment in STROKES[char]:
                a,b,c,d = shapes[segment]
                draw.rectangle((x+a,18+b,x+c,18+d), fill=fill)
            x += 64
    output = io.BytesIO(); source.save(output,'PNG')
    return output.getvalue()


def printed_label(text='HEIGHT GAUGE'):
    source = Image.new('RGB',(800,150),'white')
    ImageDraw.Draw(source).text((25,35),text,fill='black',font_size=65)
    stream=io.BytesIO(); source.save(stream,'PNG'); return stream.getvalue()
