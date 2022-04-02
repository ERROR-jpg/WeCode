<script>
    import { EditorStore } from "../services/store";
    import { get } from "svelte/store";
    import { onMount } from "svelte";
    

    
</script>

<div class="inputOutput">

<textarea class='textarea'id='input' name='input'  rows="100" cols="70" placeholder='ENTER INPUT HERE'></textarea> 
<p class='output'id='output' >OUTPUT</p>
 
</div>


<style>
    .textarea{
        resize: none;
        background-color: black;
        color:white;
        width:50%;
        height:343px;
    }
    .inputOutput{
        display:flex;
        
    }
    .output{
        white-space: pre-wrap;
        color:black;
        height: 100%;
        width: 50%;
    }
</style>