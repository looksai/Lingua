import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const approved={
 "campus-hero.webp":"1c7c640c00017bcd20bb8ccfbd45937cd32be79dd6d4a943f9735a388a939a0d",
 "campus-idiomas.webp":"e730973e424e68cfbf051e175889a15887876849a585254d375f0c8b036b004d",
 "campus-exames.webp":"1af87a339b1c3ec79d5622a46188cd3b7510e92f93d373cc73e6ceda67fc023c",
 "campus-empregos.webp":"75f2836bc47c1b4df01a4a7360df402b73b5cb6d27f447efdbd220c2b3d49258",
 "campus-imigracao.webp":"30e1a38611fea06c65d9c52fead3176c838b2f2b8aaf17675166f34e1a00029c",
 "campus-consultorias.webp":"8d98e1d4b11b1c69afa720f4a37477ffcb5acf385a5ccf0268cec2aea5657e68",
 "campus-plano.webp":"3b50a2b513a26242c4effbde01696c23c00bf1f939815833629d5d85160a4922",
 "campus-eventos.webp":"cfe8087cfb9cf0ab955d7a767d6bdc20f1c6c98b5c12a2457860dceeaf9765e6",
 "campus-noticias.webp":"abe341a3225df370e46f1c863d47beb7c26ab9d3607b7c69fac9c2088363ba9c",
 "campus-globo.webp":"76c2c3cd7b7099414e43b4c933657504048f89d1b71ffdfa59f95a0171924da0"
};
const failures=[];
for(const [name,hash] of Object.entries(approved)){
 for(const root of ["client/public","dist/public"]){
  const path=root+"/academy/campus/"+name;
  try{
   const data=readFileSync(path);
   assert.equal(data.subarray(0,4).toString(),"RIFF");
   assert.equal(data.subarray(8,12).toString(),"WEBP");
   assert.equal(createHash("sha256").update(data).digest("hex"),hash);
  }catch{failures.push(path);}
 }
}
assert.deepEqual(failures,[],"Campus art missing, changed or not copied into build. Upload the approved WebP package before publishing.");
console.log("PASS all ten approved campus assets, source and build SHA-256");
