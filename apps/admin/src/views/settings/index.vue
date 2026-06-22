<template>
  <div class="page-placeholder">
    <el-empty description="系统设置 — 功能建设中（P5.8）" :image-size="120">
      <template #image>
        <el-icon :size="80" color="#c0c4cc"><Tools /></el-icon>
      </template>
      <p class="placeholder-hint">此功能模块将在后续版本中提供，敬请期待。</p>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { Tools } from '@element-plus/icons-vue';
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

.placeholder-hint {
  color: #909399;
  font-size: 13px;
  margin-top: 8px;
}
</style>
