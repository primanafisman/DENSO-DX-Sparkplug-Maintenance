import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
test('source release excludes runtime, environments, private photos and dependency trees',async()=>{const {releaseFiles}=await import('../scripts/package-release.js');const root=await fs.mkdtemp(path.join(os.tmpdir(),'spm-release-'));try{for(const file of ['src/app.js','runtime/db.sqlite','.env','.env.example','node_modules/key.txt','cv_engine/src/main.py','cv_engine/.venv/secret.py','private.jpg','docs/guide.md']){await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),'fixture');}const files=await releaseFiles(root);assert.deepEqual(files.sort(),['.env.example','cv_engine/src/main.py','docs/guide.md','src/app.js']);}finally{await fs.rm(root,{recursive:true,force:true});}});
test('transfer package contains the offline model bundle but excludes unrelated weights',async()=>{
  const {releaseFiles}=await import('../scripts/package-release.js');
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'spm-model-bundle-'));
  try {
    for(const file of ['cv_engine/models/ocr/PP-OCRv6_det_small.onnx','cv_engine/models/ocr/PP-OCRv6_rec_small.onnx','cv_engine/models/ocr/ch_ppocr_mobile_v2.0_cls_mobile.onnx','cv_engine/models/ocr/private-extra.onnx']){
      await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),'fixture');
    }
    const files=await releaseFiles(root);
    assert.deepEqual(files, ['cv_engine/models/ocr/PP-OCRv6_det_small.onnx','cv_engine/models/ocr/PP-OCRv6_rec_small.onnx','cv_engine/models/ocr/ch_ppocr_mobile_v2.0_cls_mobile.onnx']);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('bundle creation fails when required OCR weights are absent',async()=>{
  const {packageRelease}=await import('../scripts/package-release.js');
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'spm-incomplete-bundle-'));
  try{await assert.rejects(packageRelease(root),/model|ENOENT/i);}
  finally{await fs.rm(root,{recursive:true,force:true});}
});
