import {EditorStore} from "./store";
import{get} from "svelte/store";
import axios from "axios";
import { get_current_component } from "svelte/internal";


export const submit= async ()=>{
    let code=get(EditorStore).getValue();
    //console.log(code);
    let lang=document.getElementById('lang').value;
    //console.log(lang);
    
    let input=document.getElementById('inputdata').value;
    console.log(input);

    const payload={
        code,
        lang,
        input
    };

     const {data}= await axios.post("/compile",payload);
        
    if(data.output)
    {
        
        // document.getElementById('output').style.backgroundColor="#0d5e58";
        document.getElementById('output').innerHTML=data.output;
        // document.getElementById('heading').style.backgroundColor="#0d5e58";
    }
    else
    {
        console.log(data.error);
        // document.getElementById('output').style.backgroundColor="#760430ed";
        document.getElementById('output').innerHTML=data.error;
        // document.getElementById('heading').style.backgroundColor="#760430ed";
    }
     
    

}