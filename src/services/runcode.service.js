import {EditorStore} from "./store";
import{get} from "svelte/store";
import axios from "axios";
import { get_current_component } from "svelte/internal";


export const submit= async (e)=>{
    let code=get(EditorStore).getValue();
    //console.log(code);
    let lang=document.getElementById('lang').value;
    //console.log(lang);
    let withinput=e;
   // console.log(withinput);
    let input=document.getElementById('input').value;
   // console.log(input);

    const payload={
        code,
        lang,
        withinput,
        input
    };

     const {data}= await axios.post("/compile",payload);
        
    if(data.output)
    {
        
        document.getElementById('output').style.backgroundColor="lightgreen";
        document.getElementById('output').innerHTML=data.output;
    }
    else
    {
        console.log(data.error);
        document.getElementById('output').style.backgroundColor="#ffcccb";
        document.getElementById('output').innerHTML=data.error;;
    }
     
    

}