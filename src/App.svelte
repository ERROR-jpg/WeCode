<script>
	import Header from "./components/Header.svelte";
	import SideNav from "./components/SideNav.svelte";
	import CodeEditor from "./components/CodeEditor.svelte";
	import CompileDetails from "./components/Compile.svelte";
	import { HSplitPane, VSplitPane } from 'svelte-split-pane';

	
    
  </script>
  
  <Header imageSrc="images/wecode2.png" />
  <div class="topbar">
	 <SideNav />
	</div>
 

  <VSplitPane   minTopPaneSize=50px minDownPaneSize=50px>
  <top slot="top">
  <div class="wrapper">
	<CodeEditor />
	
  </div>
  </top>
  <down slot="down">
 
  
	<CompileDetails/>

  
  </down>
 
  </VSplitPane>
  
  <style>

	top,down{
    width: 100%;
    height: 100%;
    min-height: 20%;
    display: block;
    text-align: left;
    margin: auto;
	}
	.wrapper {
	  
	  height: 100%;
	}
	

    
  </style>
  