<template>
  <div class="page-placeholder">
    <el-empty description="运营人员信息配置 — 功能开发中（P5.10）" :image-size="120">
      <template #image>
        <el-icon :size="80" color="#c0c4cc"><Phone /></el-icon>
      </template>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { Phone } from '@element-plus/icons-vue';
</script>

<style scoped lang="scss">
.page-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 4px;
  min-height: 400px;
}
</style>
