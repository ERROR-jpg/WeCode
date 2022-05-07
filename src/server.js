const express=require('express');
var compiler=require('compilex');

const app=express();
const path=require('path');
app.use(express.urlencoded({extended:true}));
app.use(express.json()); 
const port =5000;
var option= {stats:true};
compiler.init(option);





app.get('',(req,res)=>{
    app.use(express.static('pages'));
    res.sendFile(path.resolve(__dirname,'pages','home.html')); 

app.get('/startcodepage',(req,res)=>{
    app.use(express.static('public'));
    return res.sendFile(path.resolve("./",'public','index.html')); 
});

});
    app.post("/compile",(request,response)=>{
        console.log("RECEIVED");
        console.log(request.body);
        var lang=request.body.lang;
        var input=request.body.input;
        console.log(input);
        var withinput=request.body.withInput;
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
            if(withinput ){
                
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

     compiler.flush(function(){
        console.log('All temporary files flushed !'); 
        });
   
app.listen(port,()=>console.log(`Listening port ${port}`));
