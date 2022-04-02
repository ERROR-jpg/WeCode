<script>
	import Header from "./components/Header.svelte";
	import SideNav from "./components/SideNav.svelte";
	import CodeEditor from "./components/CodeEditor.svelte";
	import CompileDetails from "./components/Compile.svelte";
  </script>
  
  <Header imageSrc="images/wecode2.png" />
  <div class="wrapper">
	<CodeEditor />
	<SideNav />
  </div>
  <div class="input">
	<CompileDetails/>
  </div>
  
  <style>
	.wrapper {
	  display: flex;
	  height: 50%;
	}
	.input{
		height:70px;
		width: 100%;
	
	}
  </style>
  