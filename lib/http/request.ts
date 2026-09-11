export async function readJson(request:Request,maximum=24_000) {
  if(!request.body)throw new Error('הבקשה ריקה.');
  const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maximum){await reader.cancel();throw new Error('הבקשה גדולה מדי.');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const result=JSON.parse(new TextDecoder().decode(bytes));
  if(!result||typeof result!=='object'||Array.isArray(result))throw new Error('בקשה לא תקינה.');
  return result;
}
