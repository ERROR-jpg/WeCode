<script>
    import { onMount } from "svelte";
    import modes from "codemirror";

    import { downloadCodeFromEditor } from "../services/codeeditor.service";
    import { submit } from "../services/runcode.service";
    import { EditorStore } from "../services/store";
    import{get} from "svelte/store";
    
    const langChanged =() =>{
      var edit=get(EditorStore);
      var changedlang=document.getElementById('lang').value;
      if(changedlang === 'Python')
      {
          edit.setOption("mode",'python');
      }
      else
      {
        edit.setOption("mode",'javascript');
      }
    }
  
  
    const downloadCode = () => {
      downloadCodeFromEditor("Code.txt");
    };
    const submitCode=()=>{
        submit();
    };
  </script>
  
  <div class="side-bar">
    
    <i on:click={submitCode} class="fa fa-play icons"/>
    
    <i class='fa fa-icons-play'>
    <select  class="lang" name="lang" id="lang" on:change={langChanged} >
    <option value="cpp17">C</option>
    <option value="cpp17 ">Cpp</option>
    <option value="python3">Python</option>
    <option value="java">Java</option>
    </select>
  
    <label class="switch">
      INPUT:
     <input type="checkbox" value ="dsd" id="withInput">
    </label>
  </i>
  <div class="download_newsession">
    <i on:click={downloadCode} class="fa fa-download icons" />
    <i on:click={() => (window.open('/startcodepage'))} class="fa fa-plus icons" />
    </div>
  
   
 
    
    
  </div>
    

  
  <style>
    .download_newsession{
      position: absolute; 
      right: 0px;
      
    }
    .switch{
      color: white;
      margin-left: 20px;
    }
    .side-bar {
      display: flex;
      flex-direction: row;
      height: fit-content;
      background: #30353e;
      align-items: center;
    }
    .icons {
      font-size: 20px;
      padding: 10px;
      color: #b3b5b8;
      border-bottom: 1px solid #000;
    }
   
    .icons:hover {
      cursor: pointer;
      
    }
    .lang{
      margin-left: 20px;
     align-items: center;
    }
  </style>
  