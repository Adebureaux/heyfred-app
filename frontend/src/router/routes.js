const routes = [
  {
    path: "/login",
    component: () => import("layouts/AuthLayout.vue"),
    meta: { requiresGuest: true },
    children: [{ path: "", component: () => import("pages/auth/LoginPage.vue") }],
  },
  {
    path: "/register",
    component: () => import("layouts/AuthLayout.vue"),
    meta: { requiresGuest: true },
    children: [{ path: "", component: () => import("pages/auth/RegisterPage.vue") }],
  },
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      { path: "", component: () => import("pages/IndexPage.vue") },
      { path: "campaigns", component: () => import("pages/campaigns/CampaignsListPage.vue") },
      { path: "campaigns/new", component: () => import("pages/campaigns/NewCampaignPage.vue") },
      {
        path: "campaigns/:id",
        component: () => import("pages/campaigns/CampaignDetailPage.vue"),
      },
    ],
  },
  {
    path: "/:catchAll(.*)*",
    component: () => import("pages/ErrorNotFound.vue"),
  },
];

export default routes;
