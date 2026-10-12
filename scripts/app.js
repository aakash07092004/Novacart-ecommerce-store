
(function () {
  const { useEffect, useMemo, useState } = React;
  const h = React.createElement;
  const data = window.NOVACART_DATA;
  const iconNames = new Set(Object.keys(lucide.icons || {}));

  const storage = {
    get(key, fallback) {
      try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
      } catch (error) {
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  };

  const currency = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  });

  function formatPrice(value) {
    return currency.format(value);
  }

  function hashPassword(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16);
  }

  function icon(name, props = {}) {
    const iconName = iconNames.has(name) ? name : "Circle";
    return h("i", {
      className: `icon icon-${iconName.toLowerCase()}`,
      "data-lucide": iconName,
      ...props
    });
  }

  function slugify(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function unique(values) {
    return Array.from(new Set(values));
  }

  function useLocalState(key, initialValue) {
    const [value, setValue] = useState(() => storage.get(key, initialValue));
    useEffect(() => storage.set(key, value), [key, value]);
    return [value, setValue];
  }

  function App() {
    const [route, setRoute] = useState(() => ({ page: location.hash.replace("#", "") || "home" }));
    const [query, setQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [sort, setSort] = useState("featured");
    const [cart, setCart] = useLocalState("novacart_cart", []);
    const [wishlist, setWishlist] = useLocalState("novacart_wishlist", []);
    const [orders, setOrders] = useLocalState("novacart_orders", []);
    const [user, setUser] = useLocalState("novacart_session", null);
    const [toast, setToast] = useState("");

    useEffect(() => {
      const onHashChange = () => setRoute({ page: location.hash.replace("#", "") || "home" });
      window.addEventListener("hashchange", onHashChange);
      return () => window.removeEventListener("hashchange", onHashChange);
    }, []);

    useEffect(() => {
      lucide.createIcons();
    });

    useEffect(() => {
      if (!toast) return undefined;
      const timeout = setTimeout(() => setToast(""), 2600);
      return () => clearTimeout(timeout);
    }, [toast]);

    const productsById = useMemo(() => {
      const map = {};
      data.products.forEach((product) => {
        map[product.id] = product;
      });
      return map;
    }, []);

    const cartLines = useMemo(
      () =>
        cart
          .map((line) => ({ ...line, product: productsById[line.id] }))
          .filter((line) => line.product),
      [cart, productsById]
    );

    const cartTotal = useMemo(
      () => cartLines.reduce((total, line) => total + line.product.price * line.qty, 0),
      [cartLines]
    );

    const cartCount = useMemo(() => cart.reduce((total, line) => total + line.qty, 0), [cart]);
    const wishlistProducts = wishlist.map((id) => productsById[id]).filter(Boolean);

    function navigate(page) {
      location.hash = page;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function notify(message) {
      setToast(message);
    }

    function addToCart(id, qty = 1) {
      setCart((current) => {
        const exists = current.find((line) => line.id === id);
        if (exists) {
          return current.map((line) =>
            line.id === id ? { ...line, qty: Math.min(line.qty + qty, 9) } : line
          );
        }
        return [...current, { id, qty }];
      });
      notify("Added to cart");
    }

    function setCartQty(id, qty) {
      setCart((current) =>
        current
          .map((line) => (line.id === id ? { ...line, qty: Math.max(0, Math.min(qty, 9)) } : line))
          .filter((line) => line.qty > 0)
      );
    }

    function removeFromCart(id) {
      setCart((current) => current.filter((line) => line.id !== id));
      notify("Removed from cart");
    }

    function toggleWishlist(id) {
      setWishlist((current) => {
        if (current.includes(id)) {
          notify("Removed from wishlist");
          return current.filter((item) => item !== id);
        }
        notify("Saved to wishlist");
        return [...current, id];
      });
    }

    function submitOrder(address) {
      if (!cartLines.length) return;
      const discount = Math.round(cartTotal * 0.04);
      const order = {
        id: `NC-${Date.now().toString().slice(-7)}`,
        createdAt: new Date().toISOString(),
        status: "Processing",
        address,
        items: cartLines.map((line) => ({
          id: line.id,
          name: line.product.name,
          image: line.product.image,
          qty: line.qty,
          price: line.product.price
        })),
        total: Math.max(0, cartTotal + 99 - discount)
      };
      setOrders((current) => [order, ...current]);
      setCart([]);
      notify("Order placed successfully");
      navigate("orders");
    }

    const context = {
      route,
      query,
      setQuery,
      activeCategory,
      setActiveCategory,
      sort,
      setSort,
      navigate,
      addToCart,
      setCartQty,
      removeFromCart,
      toggleWishlist,
      submitOrder,
      cart,
      cartLines,
      cartTotal,
      cartCount,
      wishlist,
      wishlistProducts,
      orders,
      setOrders,
      user,
      setUser,
      notify,
      productsById
    };

    return h(
      React.Fragment,
      null,
      h(Header, context),
      h("main", { className: "app-shell" }, h(Router, context)),
      h(FloatingDock, context),
      toast ? h("div", { className: "toast" }, icon("CheckCircle2"), h("span", null, toast)) : null
    );
  }

  function Header(props) {
    const nav = [
      ["home", "Home"],
      ["shop", "Shop"],
      ["categories", "Categories"],
      ["deals", "Deals"],
      ["brands", "Brands"],
      ["support", "Support"],
      ["account", "Account"]
    ];

    return h(
      "header",
      { className: "site-header" },
      h(
        "button",
        { className: "brand", onClick: () => props.navigate("home"), "aria-label": "NovaCart home" },
        h("span", { className: "brand-mark" }, icon("Zap")),
        h("span", null, "NovaCart")
      ),
      h(
        "label",
        { className: "search-shell" },
        icon("Search"),
        h("input", {
          value: props.query,
          onChange: (event) => props.setQuery(event.target.value),
          onFocus: () => props.navigate("shop"),
          placeholder: "Search phones, sneakers, laptops...",
          "aria-label": "Search products"
        })
      ),
      h(
        "nav",
        { className: "top-nav", "aria-label": "Main navigation" },
        nav.map(([page, label]) =>
          h(
            "button",
            {
              key: page,
              className: props.route.page === page ? "active" : "",
              onClick: () => props.navigate(page)
            },
            label
          )
        )
      ),
      h(
        "div",
        { className: "header-actions" },
        h(IconButton, {
          iconName: "Heart",
          label: "Wishlist",
          badge: props.wishlist.length,
          onClick: () => props.navigate("wishlist")
        }),
        h(IconButton, {
          iconName: "ShoppingBag",
          label: "Cart",
          badge: props.cartCount,
          onClick: () => props.navigate("cart")
        }),
        h(
          "button",
          { className: "profile-chip", onClick: () => props.navigate(props.user ? "account" : "login") },
          icon("UserRound"),
          h("span", null, props.user ? props.user.name.split(" ")[0] : "Login")
        )
      )
    );
  }

  function IconButton({ iconName, label, badge, onClick }) {
    return h(
      "button",
      { className: "icon-button", onClick, "aria-label": label, title: label },
      icon(iconName),
      badge ? h("span", { className: "bubble" }, badge) : null
    );
  }

  function Router(props) {
    const page = props.route.page;
    if (page.startsWith("product/")) {
      return h(ProductPage, { ...props, productId: page.split("/")[1] });
    }
    if (page === "shop") return h(ShopPage, props);
    if (page === "categories") return h(CategoriesPage, props);
    if (page === "deals") return h(DealsPage, props);
    if (page === "brands") return h(BrandsPage, props);
    if (page === "support") return h(SupportPage, props);
    if (page === "wishlist") return h(WishlistPage, props);
    if (page === "cart") return h(CartPage, props);
    if (page === "checkout") return h(CheckoutPage, props);
    if (page === "login") return h(LoginPage, props);
    if (page === "account") return h(AccountPage, props);
    if (page === "orders") return h(OrdersPage, props);
    return h(HomePage, props);
  }

  function HomePage(props) {
    const bestSellers = data.products.slice().sort((a, b) => b.reviews - a.reviews).slice(0, 5);
    const heroProduct = bestSellers[0];
    const spotlight = data.products.slice().sort((a, b) => b.rating - a.rating).slice(0, 3);

    return h(
      React.Fragment,
      null,
      h(
        "section",
        { className: "hero-section reveal" },
        h(
          "div",
          { className: "hero-copy" },
          h("span", { className: "eyebrow" }, "India-ready futuristic marketplace"),
          h("h1", null, "NovaCart"),
          h(
            "p",
            null,
            "Shop curated tech, fashion, home, beauty, and fitness picks with fast filters, persistent cart, checkout, wishlist, and order tracking."
          ),
          h(
            "div",
            { className: "hero-actions" },
            h(
              "button",
              { className: "primary-btn", onClick: () => props.navigate("shop") },
              icon("ShoppingCart"),
              "Start shopping"
            ),
            h(
              "button",
              { className: "ghost-btn", onClick: () => props.navigate("deals") },
              icon("BadgePercent"),
              "View deals"
            )
          ),
          h(
            "div",
            { className: "trust-row" },
            h(TrustItem, { iconName: "Truck", value: "1.2M+", label: "fast deliveries" }),
            h(TrustItem, { iconName: "ShieldCheck", value: "100%", label: "secure checkout" }),
            h(TrustItem, { iconName: "RefreshCcw", value: "7-day", label: "easy returns" })
          )
        ),
        h(
          "div",
          { className: "hero-stage" },
          h(
            "div",
            { className: "glass-device float-card" },
            h("img", { src: bestSellers[0].image, alt: bestSellers[0].name }),
            h(
              "div",
              { className: "device-info" },
              h("span", null, "Live price"),
              h("strong", null, formatPrice(bestSellers[0].price))
            )
          ),
          h(
            "div",
            { className: "orbit-card orbit-one" },
            icon("Sparkles"),
            h("span", null, "AI picks")
          ),
          h(
            "div",
            { className: "orbit-card orbit-two" },
            icon("PackageCheck"),
            h("span", null, "Same-day")
          )
        )
      ),
      h(HomeAccessGrid, props),
      h(
        "section",
        { className: "home-split reveal" },
        h(
          "article",
          { className: "spotlight-card glass-panel" },
          h("img", { src: heroProduct.image, alt: heroProduct.name }),
          h(
            "div",
            { className: "spotlight-copy" },
            h("span", { className: "eyebrow" }, "Today only"),
            h("h2", null, heroProduct.name),
            h("p", null, heroProduct.description),
            h(
              "div",
              { className: "spotlight-meta" },
              h("strong", null, formatPrice(heroProduct.price)),
              h("span", null, `${heroProduct.rating} rated`),
              h("span", null, heroProduct.delivery)
            ),
            h(
              "div",
              { className: "hero-actions" },
              h("button", { className: "primary-btn", onClick: () => props.navigate(`product/${heroProduct.id}`) }, icon("Eye"), "Inspect item"),
              h("button", { className: "ghost-btn", onClick: () => props.addToCart(heroProduct.id) }, icon("Plus"), "Add to cart")
            )
          )
        ),
        h(
          "aside",
          { className: "live-panel glass-panel" },
          h("span", { className: "eyebrow" }, "Live commerce feed"),
          h("h2", null, "What shoppers are doing now"),
          bestSellers.slice(1).map((product, index) =>
            h(
              "button",
              { key: product.id, className: "feed-item", onClick: () => props.navigate(`product/${product.id}`) },
              h("span", null, icon(index % 2 ? "Heart" : "ShoppingBag")),
              h("strong", null, product.name),
              h("em", null, index % 2 ? "wishlisted" : "bought now")
            )
          )
        )
      ),
      h(
        "section",
        { className: "curated-lanes reveal" },
        h("div", null, h("span", { className: "eyebrow" }, "Top rated picks"), h("h2", null, "A compact preview, not the whole store")),
        h(
          "div",
          { className: "lane-row" },
          spotlight.map((product) =>
            h(
              "article",
              { key: product.id, className: "lane-card glass-panel" },
              h("img", { src: product.image, alt: product.name, loading: "lazy" }),
              h("div", null, h("span", null, product.brand), h("h3", null, product.name), h("strong", null, formatPrice(product.price))),
              h("button", { className: "mini-btn", onClick: () => props.navigate(`product/${product.id}`) }, icon("ArrowRight"), "Open")
            )
          )
        )
      ),
      h(ServiceBand)
    );
  }

  function HomeAccessGrid(props) {
    const tiles = [
      ["shop", "Storefront", "Search, filter, sort, and compare every product.", "Store", `${data.products.length} items`],
      ["categories", "Category hub", "Browse visual category rooms with product counts.", "LayoutGrid", `${data.categories.length} worlds`],
      ["deals", "Flash deals", "Coupons, timers, and highest-discount products.", "BadgePercent", "Live now"],
      ["brands", "Brand wall", "Explore sellers and labels by rating and collection.", "BadgeCheck", `${unique(data.products.map((product) => product.brand)).length} brands`],
      ["wishlist", "Wishlist", "Your saved products stay in this browser.", "Heart", `${props.wishlist.length} saved`],
      ["support", "Support", "Track orders, returns, payment help, and FAQs.", "Headphones", "24/7 ready"]
    ];
    return h(
      "section",
      { className: "home-access-grid reveal" },
      tiles.map(([page, title, text, iconName, metric]) =>
        h(
          "button",
          { key: page, className: "access-card glass-panel", onClick: () => props.navigate(page) },
          icon(iconName),
          h("span", null, metric),
          h("strong", null, title),
          h("p", null, text)
        )
      )
    );
  }

  function TrustItem({ iconName, value, label }) {
    return h("div", { className: "trust-item" }, icon(iconName), h("strong", null, value), h("span", null, label));
  }

  function CategoryStrip(props) {
    return h(
      "section",
      { className: "category-strip reveal" },
      data.categories.map((category) =>
        h(
          "button",
          {
            key: category.id,
            className: "category-pill glass-panel",
            style: { "--accent": category.color },
            onClick: () => {
              props.setActiveCategory(category.id);
              props.navigate("shop");
            }
          },
          icon(category.icon),
          h("span", null, category.name),
          h("small", null, category.label)
        )
      )
    );
  }

  function SectionHeader({ eyebrow, title, action, onAction }) {
    return h(
      "section",
      { className: "section-heading reveal" },
      h("div", null, h("span", { className: "eyebrow" }, eyebrow), h("h2", null, title)),
      action
        ? h("button", { className: "text-action", onClick: onAction }, action, icon("ArrowRight"))
        : null
    );
  }

  function ProductGrid({ products, ...props }) {
    return h(
      "section",
      { className: "product-grid reveal" },
      products.map((product) => h(ProductCard, { key: product.id, product, ...props }))
    );
  }

  function ProductCard({ product, addToCart, toggleWishlist, wishlist, navigate }) {
    const sale = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
    const saved = wishlist.includes(product.id);
    return h(
      "article",
      { className: "product-card glass-panel" },
      h(
        "button",
        {
          className: `wish-toggle ${saved ? "saved" : ""}`,
          onClick: () => toggleWishlist(product.id),
          "aria-label": saved ? "Remove from wishlist" : "Add to wishlist",
          title: saved ? "Remove from wishlist" : "Add to wishlist"
        },
        icon("Heart")
      ),
      h(
        "button",
        { className: "product-media", onClick: () => navigate(`product/${product.id}`) },
        h("img", { src: product.image, alt: product.name, loading: "lazy" }),
        h("span", { className: "badge" }, product.badge),
        h("span", { className: "sale" }, `${sale}% off`)
      ),
      h(
        "div",
        { className: "product-body" },
        h("span", { className: "brand-name" }, product.brand),
        h("button", { className: "product-title", onClick: () => navigate(`product/${product.id}`) }, product.name),
        h(
          "div",
          { className: "rating-row" },
          icon("Star"),
          h("strong", null, product.rating),
          h("span", null, `(${product.reviews.toLocaleString("en-IN")})`),
          h("em", null, product.delivery)
        ),
        h(
          "div",
          { className: "price-row" },
          h("strong", null, formatPrice(product.price)),
          h("del", null, formatPrice(product.oldPrice))
        ),
        h(
          "div",
          { className: "card-actions" },
          h(
            "button",
            { className: "cart-btn", onClick: () => addToCart(product.id) },
            icon("Plus"),
            "Cart"
          ),
          h(
            "button",
            { className: "mini-btn", onClick: () => navigate(`product/${product.id}`) },
            icon("Eye"),
            "View"
          )
        )
      )
    );
  }

  function ShopPage(props) {
    const filtered = useMemo(() => {
      const q = props.query.trim().toLowerCase();
      let items = data.products.filter((product) => {
        const matchesCategory = props.activeCategory === "all" || product.category === props.activeCategory;
        const haystack = `${product.name} ${product.brand} ${product.description} ${product.specs.join(" ")}`.toLowerCase();
        return matchesCategory && (!q || haystack.includes(q));
      });
      if (props.sort === "price-low") items = items.slice().sort((a, b) => a.price - b.price);
      if (props.sort === "price-high") items = items.slice().sort((a, b) => b.price - a.price);
      if (props.sort === "rating") items = items.slice().sort((a, b) => b.rating - a.rating);
      if (props.sort === "discount") items = items.slice().sort((a, b) => b.oldPrice - b.price - (a.oldPrice - a.price));
      return items;
    }, [props.query, props.activeCategory, props.sort]);

    return h(
      React.Fragment,
      null,
      h(
        "section",
        { className: "shop-toolbar glass-panel reveal" },
        h("div", null, h("span", { className: "eyebrow" }, "Product universe"), h("h1", null, "Shop everything")),
        h(
          "div",
          { className: "control-row" },
          h(
            "select",
            {
              value: props.activeCategory,
              onChange: (event) => props.setActiveCategory(event.target.value),
              "aria-label": "Filter by category"
            },
            h("option", { value: "all" }, "All categories"),
            data.categories.map((category) => h("option", { key: category.id, value: category.id }, category.name))
          ),
          h(
            "select",
            { value: props.sort, onChange: (event) => props.setSort(event.target.value), "aria-label": "Sort products" },
            h("option", { value: "featured" }, "Featured"),
            h("option", { value: "price-low" }, "Price: low to high"),
            h("option", { value: "price-high" }, "Price: high to low"),
            h("option", { value: "rating" }, "Top rated"),
            h("option", { value: "discount" }, "Biggest discount")
          )
        )
      ),
      h(
        "div",
        { className: "results-line" },
        h("span", null, `${filtered.length} products found`),
        props.query ? h("button", { onClick: () => props.setQuery("") }, "Clear search") : null
      ),
      filtered.length
        ? h(ProductGrid, { products: filtered, ...props })
        : h(EmptyState, {
            iconName: "SearchX",
            title: "No products matched",
            text: "Try a different search or category filter.",
            action: "Reset filters",
            onAction: () => {
              props.setQuery("");
              props.setActiveCategory("all");
            }
          })
    );
  }

  function CategoriesPage(props) {
    const stats = data.categories.map((category) => {
      const products = data.products.filter((product) => product.category === category.id);
      const best = products.slice().sort((a, b) => b.rating - a.rating)[0];
      return { category, products, best };
    });

    return h(
      React.Fragment,
      null,
      h(
        "section",
        { className: "category-overview glass-panel reveal" },
        h("div", null, h("span", { className: "eyebrow" }, "Choose a department"), h("h1", null, "Every category has its own shopping mood"), h("p", null, "This page is built like a visual department directory instead of a normal product shelf.")),
        h(
          "div",
          { className: "category-stat-row" },
          stats.slice(0, 3).map(({ category, products, best }) =>
            h(
              "button",
              {
                key: category.id,
                className: "category-stat",
                style: { "--accent": category.color },
                onClick: () => {
                  props.setActiveCategory(category.id);
                  props.navigate("shop");
                }
              },
              icon(category.icon),
              h("strong", null, category.name),
              h("span", null, `${products.length} products`),
              h("em", null, best ? `Top pick: ${best.brand}` : "Coming soon")
            )
          )
        )
      ),
      h(SectionHeader, { eyebrow: "Store map", title: "Browse by category" }),
      h(
        "section",
        { className: "category-grid reveal" },
        data.categories.map((category) => {
          const count = data.products.filter((product) => product.category === category.id).length;
          return h(
            "article",
            { key: category.id, className: "category-card glass-panel", style: { "--accent": category.color } },
            h("img", { src: category.hero, alt: category.name, loading: "lazy" }),
            h("div", { className: "category-glow" }),
            h("div", { className: "category-card-body" }, icon(category.icon), h("h2", null, category.name), h("p", null, category.label), h("span", null, `${count} products`)),
            h(
              "button",
              {
                className: "primary-btn",
                onClick: () => {
                  props.setActiveCategory(category.id);
                  props.navigate("shop");
                }
              },
              "Explore",
              icon("ArrowRight")
            )
          );
        })
      )
    );
  }

  function DealsPage(props) {
    const deals = data.products
      .slice()
      .sort((a, b) => b.oldPrice - b.price - (a.oldPrice - a.price))
      .slice(0, 12);
    const heroDeals = deals.slice(0, 3);
    return h(
      React.Fragment,
      null,
      h(
        "section",
        { className: "deals-hero glass-panel reveal" },
        h("div", null, h("span", { className: "eyebrow" }, "Live offers"), h("h1", null, "Flash deals with serious savings"), h("p", null, "Curated offers across tech, lifestyle, home, and daily essentials.")),
        h("div", { className: "deal-timer" }, h("span", null, "Ends in"), h("strong", null, "06:18:44"))
      ),
      h(
        "section",
        { className: "deal-mosaic reveal" },
        heroDeals.map((product, index) =>
          h(
            "article",
            { key: product.id, className: `deal-feature glass-panel deal-feature-${index + 1}` },
            h("img", { src: product.image, alt: product.name }),
            h("div", null, h("span", null, `${formatPrice(product.oldPrice - product.price)} saved`), h("h2", null, product.name), h("p", null, product.description), h("button", { className: "primary-btn", onClick: () => props.navigate(`product/${product.id}`) }, "Grab deal", icon("ArrowRight")))
          )
        )
      ),
      h(
        "section",
        { className: "coupon-strip reveal" },
        ["NOVA10", "FREESHIP", "TECH500", "STYLE15"].map((code, index) =>
          h("div", { key: code, className: "coupon-card" }, h("span", null, code), h("strong", null, index % 2 ? "Checkout coupon" : "Bank offer"), h("p", null, index % 2 ? "Apply during checkout on eligible products." : "Instant savings on selected cards."))
        )
      ),
      h(CampaignRail),
      h(SectionHeader, { eyebrow: "Discount shelf", title: "Highest savings products" }),
      h(ProductGrid, { products: deals, ...props })
    );
  }

  function BrandsPage(props) {
    const brands = unique(data.products.map((product) => product.brand)).map((brand) => {
      const products = data.products.filter((product) => product.brand === brand);
      const average = products.reduce((total, product) => total + product.rating, 0) / products.length;
      const lowest = Math.min(...products.map((product) => product.price));
      return { brand, products, average, lowest };
    });

    return h(
      React.Fragment,
      null,
      h(
        "section",
        { className: "brand-hero glass-panel reveal" },
        h("div", null, h("span", { className: "eyebrow" }, "Brand marketplace"), h("h1", null, "Shop by the labels people already trust"), h("p", null, "A dedicated brand page makes the platform feel bigger than a single product grid.")),
        h("div", { className: "brand-meter" }, icon("BadgeCheck"), h("strong", null, brands.length), h("span", null, "active brands"))
      ),
      h(
        "section",
        { className: "brand-wall reveal" },
        brands.map(({ brand, products, average, lowest }) =>
          h(
            "article",
            { key: brand, className: "brand-card glass-panel" },
            h("div", { className: "brand-logo" }, brand.slice(0, 2).toUpperCase()),
            h("h2", null, brand),
            h("p", null, `${products.length} products in catalog`),
            h(
              "div",
              { className: "brand-images" },
              products.slice(0, 3).map((product) => h("img", { key: product.id, src: product.image, alt: product.name, loading: "lazy" }))
            ),
            h(
              "div",
              { className: "brand-stats" },
              h("span", null, icon("Star"), average.toFixed(1)),
              h("span", null, "From ", formatPrice(lowest))
            ),
            h(
              "button",
              {
                className: "ghost-btn full",
                onClick: () => {
                  props.setQuery(brand);
                  props.setActiveCategory("all");
                  props.navigate("shop");
                }
              },
              "View products",
              icon("ArrowRight")
            )
          )
        )
      )
    );
  }

  function SupportPage(props) {
    const supportCards = [
      ["PackageSearch", "Track order", "Check current order status and delivery timeline.", "orders"],
      ["RotateCcw", "Returns", "Start a return flow for eligible delivered products.", "orders"],
      ["CreditCard", "Payment help", "UPI, card, EMI, wallet, and refund support.", "checkout"],
      ["MessageCircle", "Chat support", "Get help with account, cart, deals, and delivery.", "account"]
    ];
    const faqs = [
      ["Where is login data stored?", "This frontend stores accounts and sessions in this browser using localStorage."],
      ["Are products real?", "The catalog uses realistic product names, prices, specs, ratings, and image URLs in a separate dataset file."],
      ["Can I place orders?", "Yes. The checkout creates a saved local order and clears the cart for prototype testing."],
      ["Can this connect to a backend?", "Yes. The data and state functions are separated enough to swap localStorage for APIs later."]
    ];

    return h(
      React.Fragment,
      null,
      h(
        "section",
        { className: "support-hero glass-panel reveal" },
        h("span", { className: "eyebrow" }, "Help center"),
        h("h1", null, "Support that feels like a real ecommerce platform"),
        h("p", null, "Order tracking, returns, payment help, account assistance, and practical FAQs in one dedicated page.")
      ),
      h(
        "section",
        { className: "support-layout reveal" },
        h(
          "div",
          { className: "support-card-grid" },
          supportCards.map(([iconName, title, text, page]) =>
            h(
              "button",
              { key: title, className: "support-card glass-panel", onClick: () => props.navigate(page) },
              icon(iconName),
              h("strong", null, title),
              h("span", null, text)
            )
          )
        ),
        h(
          "aside",
          { className: "faq-panel glass-panel" },
          h("h2", null, "Quick answers"),
          faqs.map(([question, answer]) => h("details", { key: question }, h("summary", null, question), h("p", null, answer)))
        )
      )
    );
  }

  function ProductPage(props) {
    const product = props.productsById[props.productId];
    if (!product) {
      return h(EmptyState, {
        iconName: "PackageX",
        title: "Product not found",
        text: "This item is no longer available.",
        action: "Back to shop",
        onAction: () => props.navigate("shop")
      });
    }
    const related = data.products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4);
    const saved = props.wishlist.includes(product.id);

    return h(
      React.Fragment,
      null,
      h(
        "section",
        { className: "product-detail glass-panel reveal" },
        h(
          "div",
          { className: "detail-media" },
          h("img", { src: product.image, alt: product.name }),
          h("span", { className: "badge" }, product.badge)
        ),
        h(
          "div",
          { className: "detail-copy" },
          h("span", { className: "brand-name" }, product.brand),
          h("h1", null, product.name),
          h(
            "div",
            { className: "rating-row big" },
            icon("Star"),
            h("strong", null, product.rating),
            h("span", null, `${product.reviews.toLocaleString("en-IN")} verified reviews`),
            h("em", null, `${product.stock} in stock`)
          ),
          h("p", null, product.description),
          h(
            "div",
            { className: "detail-price" },
            h("strong", null, formatPrice(product.price)),
            h("del", null, formatPrice(product.oldPrice)),
            h("span", null, `${Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}% off`)
          ),
          h("div", { className: "color-row" }, product.colors.map((color) => h("span", { key: color }, color))),
          h("ul", { className: "spec-list" }, product.specs.map((spec) => h("li", { key: spec }, icon("Check"), spec))),
          h(
            "div",
            { className: "detail-actions" },
            h("button", { className: "primary-btn", onClick: () => props.addToCart(product.id) }, icon("ShoppingBag"), "Add to cart"),
            h("button", { className: "ghost-btn", onClick: () => { props.addToCart(product.id); props.navigate("checkout"); } }, icon("Zap"), "Buy now"),
            h("button", { className: `icon-button large ${saved ? "saved" : ""}`, onClick: () => props.toggleWishlist(product.id), title: "Wishlist" }, icon("Heart"))
          ),
          h(
            "div",
            { className: "detail-perks" },
            h(TrustItem, { iconName: "Truck", value: product.delivery, label: "delivery" }),
            h(TrustItem, { iconName: "ShieldCheck", value: "Secure", label: "payments" }),
            h(TrustItem, { iconName: "BadgeCheck", value: "Genuine", label: "products" })
          )
        )
      ),
      related.length ? h(SectionHeader, { eyebrow: "You may also like", title: "Related products" }) : null,
      related.length ? h(ProductGrid, { products: related, ...props }) : null
    );
  }

  function WishlistPage(props) {
    return props.wishlistProducts.length
      ? h(
          React.Fragment,
          null,
          h(SectionHeader, { eyebrow: "Saved items", title: "Your wishlist" }),
          h(ProductGrid, { products: props.wishlistProducts, ...props })
        )
      : h(EmptyState, {
          iconName: "HeartOff",
          title: "Wishlist is empty",
          text: "Save products you love and compare them later.",
          action: "Discover products",
          onAction: () => props.navigate("shop")
        });
  }

  function CartPage(props) {
    const delivery = props.cartLines.length ? 99 : 0;
    return h(
      React.Fragment,
      null,
      h(SectionHeader, { eyebrow: "Ready when you are", title: "Shopping cart" }),
      props.cartLines.length
        ? h(
            "section",
            { className: "cart-layout reveal" },
            h(
              "div",
              { className: "cart-list" },
              props.cartLines.map((line) =>
                h(
                  "article",
                  { key: line.id, className: "cart-line glass-panel" },
                  h("img", { src: line.product.image, alt: line.product.name }),
                  h(
                    "div",
                    { className: "cart-info" },
                    h("span", { className: "brand-name" }, line.product.brand),
                    h("h3", null, line.product.name),
                    h("p", null, line.product.delivery, " delivery"),
                    h("strong", null, formatPrice(line.product.price))
                  ),
                  h(
                    "div",
                    { className: "qty-stepper" },
                    h("button", { onClick: () => props.setCartQty(line.id, line.qty - 1), "aria-label": "Decrease quantity" }, icon("Minus")),
                    h("span", null, line.qty),
                    h("button", { onClick: () => props.setCartQty(line.id, line.qty + 1), "aria-label": "Increase quantity" }, icon("Plus"))
                  ),
                  h("button", { className: "remove-btn", onClick: () => props.removeFromCart(line.id), title: "Remove" }, icon("Trash2"))
                )
              )
            ),
            h(OrderSummary, { subtotal: props.cartTotal, delivery, action: "Checkout", onAction: () => props.navigate(props.user ? "checkout" : "login") })
          )
        : h(EmptyState, {
            iconName: "ShoppingCart",
            title: "Your cart is empty",
            text: "Add products from the store and they will stay saved here.",
            action: "Shop now",
            onAction: () => props.navigate("shop")
          })
    );
  }

  function OrderSummary({ subtotal, delivery, action, onAction }) {
    const discount = Math.round(subtotal * 0.04);
    const total = Math.max(0, subtotal + delivery - discount);
    return h(
      "aside",
      { className: "summary-card glass-panel" },
      h("h2", null, "Order summary"),
      h("div", null, h("span", null, "Subtotal"), h("strong", null, formatPrice(subtotal))),
      h("div", null, h("span", null, "Platform discount"), h("strong", null, `- ${formatPrice(discount)}`)),
      h("div", null, h("span", null, "Delivery"), h("strong", null, formatPrice(delivery))),
      h("div", { className: "summary-total" }, h("span", null, "Total"), h("strong", null, formatPrice(total))),
      h("button", { className: "primary-btn full", onClick: onAction, disabled: subtotal <= 0 }, icon("CreditCard"), action)
    );
  }

  function CheckoutPage(props) {
    const [address, setAddress] = useState({
      fullName: props.user?.name || "",
      phone: props.user?.phone || "",
      line: "",
      city: "",
      pin: ""
    });

    if (!props.user) {
      return h(LoginPage, props);
    }

    if (!props.cartLines.length) {
      return h(EmptyState, {
        iconName: "PackageOpen",
        title: "No items to checkout",
        text: "Your cart is currently empty.",
        action: "Go to shop",
        onAction: () => props.navigate("shop")
      });
    }

    function update(field, value) {
      setAddress((current) => ({ ...current, [field]: value }));
    }

    function submit(event) {
      event.preventDefault();
      props.submitOrder(address);
    }

    return h(
      React.Fragment,
      null,
      h(SectionHeader, { eyebrow: "Almost there", title: "Checkout" }),
      h(
        "section",
        { className: "checkout-layout reveal" },
        h(
          "form",
          { className: "checkout-form glass-panel", onSubmit: submit },
          h("h2", null, "Delivery address"),
          h(Input, { label: "Full name", value: address.fullName, onChange: (value) => update("fullName", value), required: true }),
          h(Input, { label: "Phone", value: address.phone, onChange: (value) => update("phone", value), required: true }),
          h(Input, { label: "Address line", value: address.line, onChange: (value) => update("line", value), required: true }),
          h("div", { className: "form-grid" }, h(Input, { label: "City", value: address.city, onChange: (value) => update("city", value), required: true }), h(Input, { label: "PIN code", value: address.pin, onChange: (value) => update("pin", value), required: true })),
          h("div", { className: "payment-strip" }, icon("LockKeyhole"), h("span", null, "UPI, card, wallet, and net banking ready")),
          h("button", { className: "primary-btn full" }, icon("PackageCheck"), "Place order")
        ),
        h(OrderSummary, { subtotal: props.cartTotal, delivery: 99, action: "Place order", onAction: () => document.querySelector(".checkout-form button[type='submit'], .checkout-form .primary-btn")?.click() })
      )
    );
  }

  function LoginPage(props) {
    const [mode, setMode] = useState("signin");
    const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
    const [error, setError] = useState("");

    function update(field, value) {
      setForm((current) => ({ ...current, [field]: value }));
    }

    function submit(event) {
      event.preventDefault();
      setError("");
      const users = storage.get("novacart_users", []);
      const email = form.email.trim().toLowerCase();
      if (mode === "signup") {
        if (users.some((user) => user.email === email)) {
          setError("An account already exists with this email.");
          return;
        }
        const profile = {
          id: `U-${Date.now().toString().slice(-6)}`,
          name: form.name.trim() || "Nova customer",
          email,
          phone: form.phone.trim(),
          passwordHash: hashPassword(form.password),
          createdAt: new Date().toISOString()
        };
        storage.set("novacart_users", [...users, profile]);
        props.setUser({ id: profile.id, name: profile.name, email: profile.email, phone: profile.phone });
        props.notify("Account created");
        props.navigate("account");
        return;
      }
      const found = users.find(
        (user) => user.email === email && user.passwordHash === hashPassword(form.password)
      );
      if (!found) {
        setError("Email or password did not match.");
        return;
      }
      props.setUser({ id: found.id, name: found.name, email: found.email, phone: found.phone });
      props.notify("Signed in");
      props.navigate("account");
    }

    return h(
      "section",
      { className: "auth-screen reveal" },
      h(
        "div",
        { className: "auth-visual glass-panel" },
        h("span", { className: "eyebrow" }, "Personalized shopping"),
        h("h1", null, "Your cart, wishlist, profile, and orders stay synced in this browser."),
        h("div", { className: "auth-pulse" }, icon("Fingerprint"))
      ),
      h(
        "form",
        { className: "auth-card glass-panel", onSubmit: submit },
        h("div", { className: "segmented" }, h("button", { type: "button", className: mode === "signin" ? "active" : "", onClick: () => setMode("signin") }, "Login"), h("button", { type: "button", className: mode === "signup" ? "active" : "", onClick: () => setMode("signup") }, "Create")),
        mode === "signup" ? h(Input, { label: "Name", value: form.name, onChange: (value) => update("name", value), required: true }) : null,
        h(Input, { label: "Email", type: "email", value: form.email, onChange: (value) => update("email", value), required: true }),
        mode === "signup" ? h(Input, { label: "Phone", value: form.phone, onChange: (value) => update("phone", value), required: true }) : null,
        h(Input, { label: "Password", type: "password", value: form.password, onChange: (value) => update("password", value), required: true, minLength: 4 }),
        error ? h("p", { className: "form-error" }, error) : null,
        h("button", { className: "primary-btn full" }, icon("LogIn"), mode === "signup" ? "Create account" : "Login")
      )
    );
  }

  function AccountPage(props) {
    if (!props.user) {
      return h(LoginPage, props);
    }
    return h(
      React.Fragment,
      null,
      h(SectionHeader, { eyebrow: "Control center", title: "My account" }),
      h(
        "section",
        { className: "account-grid reveal" },
        h(
          "article",
          { className: "profile-card glass-panel" },
          h("div", { className: "avatar" }, props.user.name.charAt(0).toUpperCase()),
          h("h2", null, props.user.name),
          h("p", null, props.user.email),
          h("p", null, props.user.phone || "Phone not added"),
          h("button", { className: "ghost-btn", onClick: () => { props.setUser(null); props.notify("Signed out"); props.navigate("home"); } }, icon("LogOut"), "Sign out")
        ),
        h(AccountStat, { iconName: "ShoppingBag", value: props.cartCount, label: "cart items", onClick: () => props.navigate("cart") }),
        h(AccountStat, { iconName: "Heart", value: props.wishlist.length, label: "wishlist items", onClick: () => props.navigate("wishlist") }),
        h(AccountStat, { iconName: "PackageCheck", value: props.orders.length, label: "orders placed", onClick: () => props.navigate("orders") })
      ),
      h(OrdersPage, props)
    );
  }

  function AccountStat({ iconName, value, label, onClick }) {
    return h("button", { className: "account-stat glass-panel", onClick }, icon(iconName), h("strong", null, value), h("span", null, label));
  }

  function OrdersPage(props) {
    return h(
      React.Fragment,
      null,
      h(SectionHeader, { eyebrow: "Purchase history", title: "Orders" }),
      props.orders.length
        ? h(
            "section",
            { className: "orders-list reveal" },
            props.orders.map((order) =>
              h(
                "article",
                { key: order.id, className: "order-card glass-panel" },
                h(
                  "div",
                  { className: "order-head" },
                  h("div", null, h("span", null, order.id), h("strong", null, formatPrice(order.total))),
                  h("em", null, order.status)
                ),
                h(
                  "div",
                  { className: "order-items" },
                  order.items.map((item) => h("img", { key: `${order.id}-${item.id}`, src: item.image, alt: item.name, title: `${item.qty} x ${item.name}` }))
                ),
                h("p", null, `Placed ${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`)
              )
            )
          )
        : h(EmptyState, {
            iconName: "PackageSearch",
            title: "No orders yet",
            text: "Checkout once and your order timeline will appear here.",
            action: "Shop deals",
            onAction: () => props.navigate("deals")
          })
    );
  }

  function CampaignRail() {
    return h(
      "section",
      { className: "campaign-rail reveal" },
      data.campaigns.map((campaign) =>
        h("article", { key: campaign.title, className: "campaign-card glass-panel" }, h("span", null, campaign.tag), h("h3", null, campaign.title), h("p", null, campaign.text))
      )
    );
  }

  function ServiceBand() {
    const perks = [
      ["ShieldCheck", "Verified sellers", "Quality checks before products enter the catalog."],
      ["Headphones", "24/7 support", "Chat support for delivery, return, and payment help."],
      ["WalletCards", "Flexible payments", "UPI, cards, EMI, wallets, and pay-on-delivery flows."],
      ["RotateCcw", "Easy returns", "Simple return flow for eligible items after delivery."]
    ];
    return h(
      "section",
      { className: "service-band reveal" },
      perks.map(([iconName, title, text]) =>
        h("article", { key: title, className: "service-item" }, icon(iconName), h("h3", null, title), h("p", null, text))
      )
    );
  }

  function Input({ label, value, onChange, type = "text", required = false, minLength }) {
    const id = slugify(label);
    return h(
      "label",
      { className: "field", htmlFor: id },
      h("span", null, label),
      h("input", {
        id,
        type,
        value,
        onChange: (event) => onChange(event.target.value),
        required,
        minLength
      })
    );
  }

  function EmptyState({ iconName, title, text, action, onAction }) {
    return h(
      "section",
      { className: "empty-state glass-panel reveal" },
      icon(iconName),
      h("h1", null, title),
      h("p", null, text),
      action ? h("button", { className: "primary-btn", onClick: onAction }, action, icon("ArrowRight")) : null
    );
  }

  function FloatingDock(props) {
    const items = [
      ["home", "Home", "House"],
      ["shop", "Shop", "Store"],
      ["deals", "Deals", "BadgePercent"],
      ["cart", "Cart", "ShoppingBag"],
      [props.user ? "account" : "login", "Account", "UserRound"]
    ];
    return h(
      "nav",
      { className: "floating-dock glass-panel", "aria-label": "Quick navigation" },
      items.map(([page, label, iconName]) =>
        h(
          "button",
          { key: label, className: props.route.page === page ? "active" : "", onClick: () => props.navigate(page), title: label },
          icon(iconName),
          page === "cart" && props.cartCount ? h("span", { className: "bubble" }, props.cartCount) : null
        )
      )
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(App));
})();
