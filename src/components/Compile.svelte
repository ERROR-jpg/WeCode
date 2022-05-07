<script>
    import { EditorStore } from "../services/store";
    import { get } from "svelte/store";
    import { onMount } from "svelte";
    import { HSplitPane, VSplitPane } from 'svelte-split-pane';
    

    
</script>
 

    <HSplitPane minLeftPaneSize=50px minRightPaneSize=50px >

        <left slot ="left">
            <textarea class='textarea' id='inputdata' name='inputdata'  placeholder='ENTER INPUT HERE'></textarea> 
        </left>
        <right slot="right">
        <p class='output'id='output'>OUTPUT</p>
        </right>
         
        
    </HSplitPane>


<style>
    .textarea{
        resize: none;
        background-color: black;
        color:white;
        width:100%;
        margin-left: 100;
        height:100%;
    }
    
    left,right{
    width: 100%;
    height: 100%;
    display: block;
    text-align: left;
    margin: auto;
    
    }
    .output{

        white-space:pre-wrap;
        color:white;
        margin: 0;
        height: 100%;
        width: 100%;
        background-color: black;
    }
</style>