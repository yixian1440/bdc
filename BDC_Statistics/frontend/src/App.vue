<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
// App.vue 应该是一个纯粹的容器组件，不包含业务逻辑
</script>

<style>
/* 全局样式 */
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
}

.page-container {
  padding: 20px;
}
</style>