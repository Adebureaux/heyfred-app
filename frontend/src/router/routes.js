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
      { path: "", component: () => import("pages/IndexPage.vue"), meta: { label: "Overview" } },
      {
        path: "prospects",
        component: () => import("pages/ProspectsPage.vue"),
        meta: { label: "Prospects" },
      },
      {
        path: "prospects/new",
        component: () => import("pages/prospects/NewProspectListPage.vue"),
        meta: { label: "Create a list" },
      },
      {
        path: "prospects/new/scraping",
        component: () => import("pages/prospects/NewScrapingListPage.vue"),
        meta: { label: "One-off scraping" },
      },
      {
        path: "prospects/:id",
        component: () => import("pages/prospects/ProspectListDetailPage.vue"),
        meta: { label: "Prospect list" },
      },
      {
        path: "campaigns",
        component: () => import("pages/CampaignsPage.vue"),
        meta: { label: "Campaigns" },
      },
      {
        path: "settings/linkedin",
        component: () => import("pages/settings/LinkedInSettingsPage.vue"),
        meta: { label: "Connect LinkedIn" },
      },
    ],
  },
  {
    path: "/:catchAll(.*)*",
    component: () => import("pages/ErrorNotFound.vue"),
  },
];

export default routes;
