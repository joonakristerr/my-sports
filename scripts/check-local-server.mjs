import { createServer } from 'node:http';
import assert from 'node:assert/strict';
import { findExisting,startServer } from './local-server.mjs';
const unrelated=createServer((_request,response)=>response.end('<title>My Sports</title><p>Different application</p>'));
await new Promise(resolve=>unrelated.listen(0,'127.0.0.1',resolve));
const occupiedPort=unrelated.address().port;
let app;
try {
  assert.equal(await findExisting([occupiedPort]),undefined,'Do not reuse a different application with the same title');
  app=await startServer({open:false,port:occupiedPort});
  const url=app.resolvedUrls.local[0], appPort=Number(new URL(url).port);
  assert.notEqual(appPort,occupiedPort,'Occupied ports must be left alone');
  const identity=await(await fetch(new URL('/__my-sports-instance',url))).json();
  assert.equal(identity.app,'my-sports');
  assert.equal(await findExisting([occupiedPort,appPort]),url);
  assert.equal(await findExisting([appPort]),url,'Repeated launches identify the same existing service');
  assert.equal(await findExisting(),url,'Remembered ports outside the default range are found');
  const response=await fetch(url);
  assert.equal(response.status,200);
  console.log('PASS: unrelated application ignored; occupied port preserved; existing My Sports identified repeatedly; actual port remembered; HTTP 200.');
} finally {
  if(app) await new Promise(resolve=>app.httpServer.close(resolve));
  await new Promise(resolve=>unrelated.close(resolve));
}
