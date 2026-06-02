<template>
  <div class="login-page">
    <el-card class="login-card" shadow="hover">
      <template #header>
        <div class="login-title">大洋云洁 · 管理后台</div>
        <div class="login-subtitle">P1.5 脚手架 · 本地假登录（P2.1 对接 JWT）</div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" placeholder="admin@dayangyunjie.com" clearable />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="任意非空密码"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useUserStore } from '@/store';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  username: 'admin@dayangyunjie.com',
  password: 'admin123',
});

const rules: FormRules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

async function handleLogin() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    const ok = userStore.mockLogin(form.username, form.password);
    if (!ok) {
      ElMessage.error('账号或密码不能为空');
      return;
    }
    ElMessage.success('登录成功（本地 mock）');
    const redirect = (route.query.redirect as string) || '/dashboard';
    await router.push(redirect);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1d3557 0%, #457b9d 50%, #a8dadc 100%);
}

.login-card {
  width: 420px;

  .login-title {
    font-size: 20px;
    font-weight: 600;
    text-align: center;
  }

  .login-subtitle {
    margin-top: 8px;
    font-size: 12px;
    color: #909399;
    text-align: center;
  }

  .login-btn {
    width: 100%;
  }
}
</style>
