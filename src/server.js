const express=require('express');
var compiler=require('compilex');

const app=express();
const path=require('path');
app.use(express.urlencoded({extended:true}));
app.use(express.json()); 
const port =5000;
var option= {stats:true};
compiler.init(option);



app.use(express.static('public'));
app.get('*',(req,res)=>{
    return res.sendFile(path.resolve(__dirname,'public','index.html')); 
});
    app.post("/compile",(request,response)=>{
        console.log("RECEIVED");
        console.log(request.body);
        var lang=request.body.lang;
        var input=request.body.input;
        var withinput=request.body.withinput;
        var code=request.body.code;
        if(lang==='C'||lang==='Cpp '){
            var envData={OS: "windows", cmd: "g++" , options:{timeout:1000}};
            if(withinput){
                
                compiler.compileCPPWithInput(envData,code,input,function (data) {
                   return response.json(data);
                });
            }
            else{
                compiler.compileCPP(envData,code,function (data) {
                    return response.json(data);
                 });
                
                }
        }

        if(lang==='Python'){
            var envData={OS: "windows",  options:{timeout:1000}};
            if(withinput){
                
                compiler.compilePythonWithInput(envData,code,input,function (data) {
                   return response.json(data);
                });
            }
            else{
                compiler.compilePython(envData,code,function (data) {
                    return response.json(data);
                 });
                
                }
        }

        if(lang==='Java'){
            var envData={OS: "windows",  options:{timeout:1000}};
            if(withinput){
                
                compiler.compileJavaWithInput(envData,code,input,function (data) {
                   return response.json(data);
                });
            }
            else{
                compiler.compileJava(envData,code,function (data) {
                    return response.json(data);
                 });
                
                }
        }
        
        
        
        
        


     });
app.listen(port,()=>console.log(`Listening port ${port}`));
