import {it,expect} from 'vitest';
import {containTransform,viewportToImage,moveRoi,resizeRoi,guideRegions} from './roiGeometry';
it('letterboxed oriented coordinates stay normalized across zoom and drag',()=>{
  const transform=containTransform(400,800,800,400,1,0,0);expect(transform.width).toBe(200);expect(transform.left).toBe(300);expect(viewportToImage({x:400,y:200},transform)).toEqual({x:.5,y:.5});
  const roi={x:.1,y:.1,width:.5,height:.5};expect(moveRoi(roi,{x:.1,y:0})).toEqual({x:.2,y:.1,width:.5,height:.5});expect(resizeRoi(roi,{x:1,y:1}).width).toBe(.9);
  const guides=guideRegions(400,800);expect(guides.gauge.width*400).toBe(guides.gauge.height*800);expect(guides.label.y).toBeGreaterThan(guides.gauge.y+guides.gauge.height);
});
