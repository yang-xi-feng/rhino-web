<script setup>
import RhinoViewport from './components/RhinoViewport.vue'
</script>

<template>
  <header class="app-header">
    <h1>Rhino Web 集成</h1>
    <p>在Rhino软件中嵌入的Vue网页应用</p>
  </header>
  
  <main class="app-main">
    <RhinoViewport />
  </main>
</template>

<style scoped>
.app-header {
  text-align: center;
  padding: 30px 20px;
  background-color: #35495e;
  color: white;
  margin-bottom: 30px;
}

.app-header h1 {
  margin: 0 0 10px 0;
  font-size: 2.5em;
}

.app-header p {
  margin: 0;
  font-size: 1.2em;
  opacity: 0.9;
}

.app-main {
  min-height: calc(100vh - 200px);
  padding-bottom: 30px;
}
</style>
