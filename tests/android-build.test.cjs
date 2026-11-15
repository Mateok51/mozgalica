const {test}=require('node:test');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
test('Cloud APK installs beside the original with its own pinned signer and real Activity',()=>{
 execFileSync('python3',['-B',path.join(__dirname,'../android/tests/build_test.py')],{stdio:'pipe'});
});
