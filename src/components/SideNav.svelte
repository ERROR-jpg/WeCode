<script>
    import { onMount } from "svelte";

    import { downloadCodeFromEditor } from "../services/codeeditor.service";
    import { submit } from "../services/runcode.service";
    import Switch from "svelte-switch";
    export let withInput=false;
  
    const downloadCode = () => {
      downloadCodeFromEditor("Code.txt");
    };
    const submitCode=()=>{
        submit(withInput);
    };
  </script>
  
  <div class="side-bar">
    <i on:click={downloadCode} class="fa fa-download icons" />
    <i on:click={() => (window.location.href = "/")} class="fa fa-plus icons" />
    <button on:click={submitCode}>RUN</button>
    

  <select name="lang" id="lang">
  <option value="C">C</option>
  <option value="Cpp ">Cpp</option>
  <option value="Python">Python</option>
  <option value="Java">Java</option>
  </select>
  <Switch id='withInput' bind:checked={withInput}></Switch>
    
  </div>
  
  <style>
    .side-bar {
      display: flex;
      flex-direction: column;
      background: #30353e;
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
  </style>
  