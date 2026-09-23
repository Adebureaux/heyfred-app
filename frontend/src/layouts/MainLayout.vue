<template>
  <q-layout view="lHh LpR lFf" class="heyfred-workspace">
    <q-header class="topbar">
      <q-toolbar>
        <q-btn
          flat
          round
          dense
          size="lg"
          color="primary"
          icon="menu"
          aria-label="Toggle menu"
          @click="drawerOpen = !drawerOpen"
        />
        <q-breadcrumbs class="topbar-breadcrumbs" active-color="primary">
          <q-breadcrumbs-el
            v-for="crumb in breadcrumbs"
            :key="crumb.label"
            :label="crumb.label"
            :to="crumb.to"
          />
        </q-breadcrumbs>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawerOpen" :breakpoint="900" class="hifred-sidebar">
      <div class="sidebar-inner">
        <div class="brand">
          <HeyFredLogo light large />
        </div>

        <q-list class="sidebar-nav">
          <q-item
            v-for="item in navItems"
            :key="item.to"
            clickable
            :to="item.to"
            class="nav-button"
            :class="{ 'nav-button--active': isActive(item.to) }"
          >
            <q-item-section avatar>
              <q-icon :name="item.icon" />
            </q-item-section>
            <q-item-section>{{ item.label }}</q-item-section>
          </q-item>
        </q-list>

        <q-space />

        <div class="sidebar-footer">
          <div class="sidebar-fred">
            <img src="/fred-app-icon-v2.png" alt="" />
            <span>Your prospecting butler.</span>
          </div>
          <div v-if="authStore.user" class="profile">
            <span class="profile-avatar">{{ initials }}</span>
            <div>
              {{ authStore.user.name }}
              <small>{{ authStore.user.email }}</small>
            </div>
            <q-btn flat round dense icon="logout" aria-label="Log out" @click="onLogout" />
          </div>
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <div class="main-content">
        <router-view />
      </div>
    </q-page-container>
  </q-layout>
</template>

<script>
import { computed, defineComponent, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "stores/auth";
import HeyFredLogo from "components/HeyFredLogo.vue";

const NAV_ITEMS = [
  { label: "Overview", icon: "dashboard", to: "/" },
  { label: "Prospects", icon: "groups", to: "/prospects" },
  { label: "Campaigns", icon: "campaign", to: "/campaigns" },
  { label: "Settings", icon: "settings", to: "/settings/linkedin" },
];

export default defineComponent({
  name: "MainLayout",
  components: { HeyFredLogo },
  setup() {
    const authStore = useAuthStore();
    const router = useRouter();
    const route = useRoute();

    const drawerOpen = ref(true);
    const initials = computed(() => authStore.user?.name?.[0]?.toUpperCase() ?? "?");

    const breadcrumbs = computed(() => {
      const labeledRecords = route.matched.filter((record) => record.meta?.label);
      const crumbs = [{ label: "My workspace", to: "/" }];
      labeledRecords.forEach((record, index) => {
        const isCurrent = index === labeledRecords.length - 1;
        crumbs.push({ label: record.meta.label, to: isCurrent ? null : record.path });
      });
      return crumbs;
    });

    function isActive(to) {
      return to === "/" ? route.path === "/" : route.path.startsWith(to);
    }

    function onLogout() {
      authStore.logout();
      router.push("/login");
    }

    return { authStore, navItems: NAV_ITEMS, initials, isActive, onLogout, drawerOpen, breadcrumbs };
  },
});
</script>

<style scoped>
.topbar {
  background: #fffdf9ed;
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--heyfred-border);
  min-height: 70px;
  display: flex;
  align-items: center;
}
:deep(.q-toolbar) {
  display: flex;
  align-items: center;
}
.topbar-breadcrumbs {
  margin-left: 14px;
  font-size: 14px;
}
.topbar-breadcrumbs :deep(.q-breadcrumbs__el-icon) {
  color: var(--heyfred-muted);
}
/* Quasar renders <q-drawer class="hifred-sidebar"> by putting our class on
   a nested .q-drawer__content div, but the actual <aside class="q-drawer">
   element itself also carries background: #fff from Quasar's core CSS —
   override it directly so no white ever shows through underneath. */
:deep(.q-drawer) {
  background: #171411;
}
.hifred-sidebar {
  background: radial-gradient(ellipse 160% 33% at 0 100%, #8f441c36, transparent), #171411;
  border-right: 1px solid #ffffff16;
}
.main-content {
  max-width: 1580px;
  width: 100%;
  margin: auto;
  padding: 32px 35px;
}
.sidebar-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 13px 13px 18px;
}
.brand {
  display: flex;
  justify-content: center;
  padding: 12px 2px 27px;
}
.sidebar-nav {
  padding: 0;
}
.sidebar-nav .nav-button {
  border-radius: 9px;
  padding: 12px 11px;
  min-height: 42px;
  color: #bcb0a5;
  margin-bottom: 6px;
}
.sidebar-nav .nav-button:hover:not(.nav-button--active) {
  color: #f4d5bb;
  background: #ffffff0a;
}
.sidebar-nav .nav-button--active {
  background: #ffeddf;
  color: #793e1d;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}
.sidebar-nav .nav-button--active :deep(.q-icon) {
  color: #d97436;
}
.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}
.sidebar-fred {
  display: flex;
  align-items: center;
  gap: 20px;
  background: linear-gradient(130deg, #3b281b, #211b15);
  border: 1px solid #78503555;
  padding: 14px 12px;
  border-radius: 12px;
  color: #d4b79f;
  font-size: 14px;
}
.sidebar-fred img {
  width: 35px;
  height: 35px;
  object-fit: contain;
  background: #fff;
  border-radius: 22%;
  flex-shrink: 0;
  border: 1px solid #fff3;
}
.profile {
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid #ffffff18;
  padding-top: 12px;
  color: #dfcdbf;
  font-size: 12px;
}
.profile small {
  display: block;
  color: #998879;
  font-size: 10px;
}
.profile-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  background: #714320;
  color: #ffd8b9;
  border: 1px solid #bb7b4138;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}
.profile > div {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.profile :deep(.q-btn) {
  color: #ecddd0;
  flex-shrink: 0;
}
</style>
