const express=require('express');
var compiler=require('compilex');
var axios =require('axios');
require('dotenv').config();

const app=express();
const path=require('path');
app.use(express.urlencoded({extended:true}));
app.use(express.json()); 

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

app.get('/image',(req,res)=>{
    app.use(express.static('pages'));
    res.sendFile(path.resolve(__dirname,'pages','wecode4.png')); 
     
});

    app.post("/compile",(request,response)=>{
        console.log("RECEIVED");
        console.log(request.body);
        var lang=request.body.lang;
        var input=request.body.input;
        console.log(input);
        
        var code=request.body.code;
        
        const program = {
            "clientId" : process.env.CLIENT_ID,
            "clientSecret" :process.env.SECRET,
            "script" : code,
            "language" : lang,
            "versionIndex" : "0",
            "stdin" : input
        }
        const url = "https://api.jdoodle.com/v1/execute";

        axios.post(url,program)
        .then(resp => {
            console.log('jdoodleResp')
            console.log(resp.data)
            response.send(resp.data)
        })
        .catch(error => {

          
            response.send('error')
            
        })



        
         





        // if(lang==='C'||lang==='Cpp '){
        //     var envData={OS: "windows", cmd: "g++" , options:{timeout:10000}};
        //     if(withinput){
                
        //         compiler.compileCPPWithInput(envData,code,input,function (data) {
        //            return response.json(data);
        //         });
        //     }
        //     else{
        //         compiler.compileCPP(envData,code,function (data) {
        //             return response.json(data);
        //          });
                
        //         }
        // }

        // if(lang==='Python'){
        //     var envData={OS: "windows",  options:{timeout:1000}};
        //     if(withinput ){
                
        //         compiler.compilePythonWithInput(envData,code,input,function (data) {
        //            return response.json(data);
        //         });
        //     }
        //     else{
        //         compiler.compilePython(envData,code,function (data) {
        //             return response.json(data);
        //          });
                
        //         }
        // }

        // if(lang==='Java'){
        //     var envData={OS: "windows",  options:{timeout:10000}};
        //     if(withinput){
                
        //         compiler.compileJavaWithInput(envData,code,input,function (data) {
        //            return response.json(data);
        //         });
        //     }
        //     else{
        //         compiler.compileJava(envData,code,function (data) {
        //             return response.json(data);
        //          });
                
        //         }
        // }
        
        
        
        
        


     });

     compiler.flush(function(){
        console.log('All temporary files flushed !'); 
        });
   
app.listen(process.env.PORT || 3000,()=>console.log("Listening port 3000"));
