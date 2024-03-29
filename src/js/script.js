/* global Handlebars, utils, dataSource */ // eslint-disable-line no-unused-vars

{
  ('use strict');

  const select = {
    templateOf: {
      menuProduct: '#template-menu-product',
      cartProduct: '#template-cart-product', // CODE ADDED
    },
    containerOf: {
      menu: '#product-list',
      cart: '#cart',
    },
    all: {
      menuProducts: '#product-list > .product',
      menuProductsActive: '#product-list > .product.active',
      formInputs: 'input, select',
    },
    menuProduct: {
      clickable: '.product__header',
      form: '.product__order',
      priceElem: '.product__total-price .price',
      imageWrapper: '.product__images',
      amountWidget: '.widget-amount',
      cartButton: '[href="#add-to-cart"]',
    },
    widgets: {
      amount: {
        input: 'input.amount', // CODE CHANGED
        linkDecrease: 'a[href="#less"]',
        linkIncrease: 'a[href="#more"]',
      },
    },
    // CODE ADDED START
    cart: {
      productList: '.cart__order-summary',
      toggleTrigger: '.cart__summary',
      totalNumber: `.cart__total-number`,
      totalPrice:
        '.cart__total-price strong, .cart__order-total .cart__order-price-sum strong',
      subtotalPrice: '.cart__order-subtotal .cart__order-price-sum strong',
      deliveryFee: '.cart__order-delivery .cart__order-price-sum strong',
      form: '.cart__order',
      formSubmit: '.cart__order [type="submit"]',
      phone: '[name="phone"]',
      address: '[name="address"]',
    },
    cartProduct: {
      amountWidget: '.widget-amount',
      price: '.cart__product-price',
      edit: '[href="#edit"]',
      remove: '[href="#remove"]',
    },
    // CODE ADDED END
  };

  const classNames = {
    menuProduct: {
      wrapperActive: 'active',
      imageVisible: 'active',
    },
    // CODE ADDED START
    cart: {
      wrapperActive: 'active',
    },
    // CODE ADDED END
  };

  const settings = {
    amountWidget: {
      defaultValue: 1,
      defaultMin: 1,
      defaultMax: 9,
    }, // CODE CHANGED
    // CODE ADDED START
    cart: {
      defaultDeliveryFee: 20,
    },
    // CODE ADDED END
    db: {
      url: '//localhost:3131',
      products: 'products',
      orders: 'orders',
    },
  };

  const templates = {
    menuProduct: Handlebars.compile(
      document.querySelector(select.templateOf.menuProduct).innerHTML
    ),
    // CODE ADDED START
    cartProduct: Handlebars.compile(
      document.querySelector(select.templateOf.cartProduct).innerHTML
    ),
    // CODE ADDED END
  };

  class Product {
    constructor(id, data) {
      const thisProduct = this;
      thisProduct.dom = {};

      thisProduct.id = id;
      thisProduct.data = data;
      thisProduct.renderInMenu();
      thisProduct.getElements();
      thisProduct.initAccordion();
      thisProduct.initOrderForm();
      thisProduct.initAmountWidget();
      thisProduct.processOrder();
    }
    renderInMenu() {
      const thisProduct = this;
      /*generate HTML based on template*/
      const generatedHTML = templates.menuProduct(thisProduct.data);

      /*create element using utils.CreateElementFromHTML*/
      thisProduct.element = utils.createDOMFromHTML(generatedHTML);
      /*find menu container*/
      const menuContainer = document.querySelector(select.containerOf.menu);
      /*add element to menu*/
      menuContainer.appendChild(thisProduct.element);
    }
    getElements() {
      const thisProduct = this;
      thisProduct.dom = {};
      thisProduct.accordionTrigger = thisProduct.element.querySelector(
        select.menuProduct.clickable
      );
      thisProduct.form = thisProduct.element.querySelector(
        select.menuProduct.form
      );
      thisProduct.formInputs = thisProduct.form.querySelectorAll(
        select.all.formInputs
      );
      thisProduct.cartButton = thisProduct.element.querySelector(
        select.menuProduct.cartButton
      );
      thisProduct.priceElem = thisProduct.element.querySelector(
        select.menuProduct.priceElem
      );
      thisProduct.imageWrapper = thisProduct.element.querySelector(
        select.menuProduct.imageWrapper
      );
      thisProduct.amountWidgetElem = thisProduct.element.querySelector(
        select.menuProduct.amountWidget
      );
    }
    initAccordion() {
      const thisProduct = this;
      thisProduct.dom = {};
      /* find the clickable trigger (the element that should react to clicking) */

      /* START: add event listener to clickable trigger on event click */
      thisProduct.accordionTrigger.addEventListener('click', function (event) {
        /* prevent default action for event */
        event.preventDefault();
        /* find active product (product that has active class) */
        const activeProducts = document.querySelectorAll(
          '.product',
          '.' + classNames.menuProduct.wrapperActive
        );
        for (let activeProduct of activeProducts) {
          /* if there is active product and it's not thisProduct.element, remove class active from it */
          if (activeProduct && activeProduct != thisProduct.element) {
            activeProduct.classList.remove(
              classNames.menuProduct.wrapperActive
            );
          }
        }
        /* toggle active class on thisProduct.element */
        thisProduct.element.classList.toggle(
          classNames.menuProduct.wrapperActive
        );
      });
    }
    initOrderForm() {
      const thisProduct = this;
      thisProduct.dom = {};

      thisProduct.form.addEventListener('submit', function (event) {
        event.preventDefault();
        thisProduct.processOrder();
      });

      for (let input of thisProduct.formInputs) {
        input.addEventListener('change', function () {
          thisProduct.processOrder();
        });
      }

      thisProduct.cartButton.addEventListener('click', function (event) {
        event.preventDefault();
        thisProduct.processOrder();
        thisProduct.addToCart();
      });
    }
    initAmountWidget() {
      const thisProduct = this;
      thisProduct.dom = {};
      thisProduct.amountWidget = new AmountWidget(thisProduct.amountWidgetElem);
      thisProduct.amountWidgetElem.addEventListener('updated', function () {
        thisProduct.processOrder();
      });
    }
    processOrder() {
      const thisProduct = this;
      thisProduct.dom = {};

      // covert form to object structure e.g. { sauce: ['tomato'], toppings: ['olives', 'redPeppers']}
      const formData = utils.serializeFormToObject(thisProduct.form);

      // set price to default price
      let price = thisProduct.data.price;

      // for every category (param)...
      for (let paramId in thisProduct.data.params) {
        // determine param value, e.g. paramId = 'toppings', param = { label: 'Toppings', type: 'checkboxes'... }
        const param = thisProduct.data.params[paramId];

        // for every option in this category
        for (let optionId in param.options) {
          // determine option value, e.g. optionId = 'olives', option = { label: 'Olives', price: 2, default: true }
          const option = param.options[optionId];

          const optionSelected =
            formData[paramId] && formData[paramId].includes(optionId);
          // check if there is param with a name of paramId in formData and if it includes optionId
          if (optionSelected) {
            const optionImage = thisProduct.imageWrapper.querySelector(
              '.' + paramId + '-' + optionId
            );

            if (optionImage) {
              if (optionSelected)
                optionImage.classList.add(classNames.menuProduct.imageVisible);
            }
            // check if the option is not default
            if (!option.default) {
              // add option price to price variable
              price = price + option.price;
            }
          } else {
            // check if the option is default
            const optionImage = thisProduct.imageWrapper.querySelector(
              '.' + paramId + '-' + optionId
            );
            if (optionImage) {
              optionImage.classList.remove(classNames.menuProduct.imageVisible);
            }
            if (option.default) {
              // reduce price variable
              price = price - option.price;
            }
          }
        }
      }
      thisProduct.priceSingle = price;
      /*multiply price by amount*/
      price *= thisProduct.amountWidget.value;
      // update calculated price in the HTML
      thisProduct.priceElem.innerHTML = price;
    }
    addToCart() {
      const thisProduct = this;
      app.cart.add(thisProduct.prepareCartProduct());
    }
    prepareCartProduct() {
      const thisProduct = this;
      const priceSingle = thisProduct.priceSingle;
      const price = priceSingle * thisProduct.amountWidget.value;

      const productSummary = {
        params: thisProduct.prepareCartProductParams(),
        id: thisProduct.id,
        name: thisProduct.data.name,
        amount: thisProduct.amountWidget.value,
        priceSingle: priceSingle,
        price: price,
      };
      return productSummary;
    }
    prepareCartProductParams() {
      const thisProduct = this;
      thisProduct.dom = {};

      // covert form to object structure e.g. { sauce: ['tomato'], toppings: ['olives', 'redPeppers']}
      const formData = utils.serializeFormToObject(thisProduct.form);

      const params = {};

      // for very category (param)
      for (let paramId in thisProduct.data.params) {
        const param = thisProduct.data.params[paramId];

        // create category param in params const eg. params = { ingredients: { name: 'Ingredients', options: {}}}
        params[paramId] = {
          label: param.label,
          options: {},
        };

        // for every option in this category
        for (let optionId in param.options) {
          const option = param.options[optionId];
          const optionSelected =
            formData[paramId] && formData[paramId].includes(optionId);

          if (optionSelected) {
            // option is selected!
            params[paramId].options[optionId] = option.label;
          }
        }
      }
      return params;
    }
  }
  class AmountWidget {
    constructor(element) {
      const thisWidget = this;
      thisWidget.getElements(element);
      thisWidget.setValue(
        thisWidget.input.value || settings.amountWidget.defaultValue
      );
      thisWidget.initActions();
    }
    getElements(element) {
      const thisWidget = this;

      thisWidget.element = element;
      thisWidget.input = thisWidget.element.querySelector(
        select.widgets.amount.input
      );
      thisWidget.linkDecrease = thisWidget.element.querySelector(
        select.widgets.amount.linkDecrease
      );
      thisWidget.linkIncrease = thisWidget.element.querySelector(
        select.widgets.amount.linkIncrease
      );
    }
    setValue(value) {
      const thisWidget = this;
      const newValue = parseInt(value);
      /*TODO add Validation */
      if (thisWidget.value != newValue && !isNaN(newValue)) {
        thisWidget.value = newValue;
      }
      thisWidget.input.value = thisWidget.value;
    }
    initActions() {
      const thisWidget = this;
      thisWidget.input.addEventListener('change', function () {
        thisWidget.setValue(thisWidget.input.value);
        thisWidget.announce();
      });
      thisWidget.linkDecrease.addEventListener('click', function (event) {
        event.preventDefault();
        if (thisWidget.value >= settings.amountWidget.defaultMin) {
          thisWidget.value = thisWidget.value - 1;
          thisWidget.setValue(thisWidget.value);
          thisWidget.announce();
        }
      });
      thisWidget.linkIncrease.addEventListener('click', function (event) {
        event.preventDefault();
        if (thisWidget.value <= settings.amountWidget.defaultMax) {
          thisWidget.value = thisWidget.value + 1;
          thisWidget.setValue(thisWidget.value);
          thisWidget.announce();
        }
      });
    }
    announce() {
      const thisWidget = this;
      const event = new CustomEvent('updated', {
        bubbles: true,
      });
      thisWidget.element.dispatchEvent(event);
    }
  }
  class Cart {
    constructor(element) {
      const thisCart = this;
      thisCart.products = [];
      thisCart.getElements(element);
      thisCart.initActions();
    }
    getElements(element) {
      const thisCart = this;
      thisCart.dom = {};
      thisCart.dom.wrapper = element;
      thisCart.dom.toggleTrigger = thisCart.dom.wrapper.querySelector(
        select.cart.toggleTrigger
      );
      thisCart.dom.productList = thisCart.dom.wrapper.querySelector(
        select.cart.productList
      );
      thisCart.dom.deliveryFee = thisCart.dom.wrapper.querySelector(
        select.cart.deliveryFee
      );
      thisCart.dom.subtotalPrice = thisCart.dom.wrapper.querySelector(
        select.cart.subtotalPrice
      );
      thisCart.dom.totalPrice = thisCart.dom.wrapper.querySelectorAll(
        select.cart.totalPrice
      );
      console.log('getElements:', thisCart.dom.subtotalPrice);
      console.log('getElements:', thisCart.dom.totalPrice);
      thisCart.dom.totalNumber = thisCart.dom.wrapper.querySelector(
        select.cart.totalNumber
      );
      thisCart.dom.form = thisCart.dom.wrapper.querySelector(select.cart.form);
      thisCart.dom.phone = thisCart.dom.wrapper.querySelector(
        select.cart.phone
      );
      thisCart.dom.address = thisCart.dom.wrapper.querySelector(
        select.cart.address
      );
    }
    initActions() {
      const thisCart = this;
      thisCart.dom.toggleTrigger.addEventListener('click', function () {
        thisCart.dom.wrapper.classList.toggle(classNames.cart.wrapperActive);
      });
      thisCart.dom.productList.addEventListener('updated', function () {
        thisCart.update();
      });
      thisCart.dom.productList.addEventListener('remove', function () {
        thisCart.remove(event.detail.cartProduct);
      });
      thisCart.dom.form.addEventListener('submit', function (event) {
        event.preventDefault();
        thisCart.sendOrder();
      });
    }
    add(menuProduct) {
      const thisCart = this;
      /*generate HTML based on template*/
      const generatedHTML = templates.cartProduct(menuProduct);

      /*create element using utils.CreateElementFromHTML*/
      const generatedDOM = utils.createDOMFromHTML(generatedHTML);

      /*add element to menu*/
      thisCart.dom.productList.appendChild(generatedDOM);
      thisCart.products.push(new CartProduct(menuProduct, generatedDOM));
      thisCart.update();
    }
    update() {
      const thisCart = this;
      const deliveryFee = settings.cart.defaultDeliveryFee;
      thisCart.totalNumber = 0;
      thisCart.subtotalPrice = 0;
      console.log('thisCart.products:', thisCart.products);
      for (thisCart.product of thisCart.products) {
        console.log('thisCartProduct', thisCart.product);
        thisCart.totalNumber = thisCart.totalNumber + thisCart.product.amount;
        thisCart.subtotalPrice =
          thisCart.subtotalPrice + thisCart.product.price;
      }
      if (thisCart.totalNumber > 0 /*|| thisCart.product.amount.value > 0*/) {
        thisCart.totalPrice = thisCart.subtotalPrice + deliveryFee;
        thisCart.dom.deliveryFee.innerHTML = deliveryFee;
        thisCart.dom.totalPrice.innerHTML = thisCart.totalPrice;
        thisCart.dom.subtotalPrice.innerHTML = thisCart.subtotalPrice;
        thisCart.dom.totalNumber.innerHTML = thisCart.totalNumber;
        for (let totalPriceItem of thisCart.dom.totalPrice) {
          totalPriceItem.innerHTML = thisCart.totalPrice;
        }
        thisCart.dom.subtotalPrice.innerHTML = thisCart.subtotalPrice;
        thisCart.dom.totalNumber.innerHTML = thisCart.totalNumber;
      } else {
        thisCart.dom.totalPrice.innerHTML = 0;
        thisCart.dom.deliveryFee.innerHTML = 0;
        thisCart.dom.subtotalPrice.innerHTML = 0;
        thisCart.dom.totalNumber.innerHTML = 0;
        for (let totalPriceItem of thisCart.dom.totalPrice) {
          totalPriceItem.innerHTML = 0;
        }
      }

      console.log(
        'totalNumber:',
        thisCart.totalNumber,
        'subtotalPrice:',
        thisCart.subtotalPrice,
        'deliveryFee:',
        deliveryFee,
        'thisCart.totalPrice',
        thisCart.totalPrice
      );
    }
    remove(productToRemove) {
      const thisCart = this;
      console.log('del', productToRemove.amountWidget.element);

      productToRemove.amountWidget.element.remove();
      const indexOfProductToRemove = thisCart.products.indexOf(productToRemove);
      thisCart.products.splice(indexOfProductToRemove, 1);
      console.log('array:', thisCart.products);
      thisCart.update();
    }
    sendOrder() {
      const thisCart = this;
      const url = settings.db.url + '/' + settings.db.orders;
      const payload = {
        address: thisCart.dom.address.value,
        phone: thisCart.dom.phone.value,
        totalPrice: thisCart.totalPrice,
        subtotalPrice: thisCart.subtotalPrice,
        totalNumber: thisCart.totalNumber,
        deliveryFee: thisCart.dom.deliveryFee.innerHTML,
        products: [],
      };
      console.log('hint', payload.products);
      for (let prod of thisCart.products) {
        payload.products.push(prod.getData());
      }
      console.log('payload', payload);
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      };

      fetch(url, options);
    }
  }

  class CartProduct {
    constructor(menuProduct, element) {
      const thisCartProduct = this;
      thisCartProduct.id = menuProduct.id;
      thisCartProduct.name = menuProduct.name;
      thisCartProduct.amount = menuProduct.amount;
      thisCartProduct.priceSingle = menuProduct.priceSingle;
      thisCartProduct.price = menuProduct.price;
      thisCartProduct.params = menuProduct.params;
      thisCartProduct.getElements(element);
      thisCartProduct.initAmountWidget();
      thisCartProduct.initActions();
    }
    getElements(element) {
      const thisCartProduct = this;
      thisCartProduct.dom = {};
      thisCartProduct.dom.wrapper = element;
      thisCartProduct.dom.amountWidget =
        thisCartProduct.dom.wrapper.querySelector(
          select.cartProduct.amountWidget
        );
      thisCartProduct.dom.price = thisCartProduct.dom.wrapper.querySelector(
        select.cartProduct.price
      );
      thisCartProduct.dom.edit = thisCartProduct.dom.wrapper.querySelector(
        select.cartProduct.edit
      );
      thisCartProduct.dom.remove = thisCartProduct.dom.wrapper.querySelector(
        select.cartProduct.remove
      );
    }
    initAmountWidget() {
      const thisCartProduct = this;

      thisCartProduct.amountWidget = new AmountWidget(
        thisCartProduct.dom.wrapper
      );

      thisCartProduct.dom.wrapper.addEventListener('updated', function () {
        thisCartProduct.amount = thisCartProduct.amountWidget.value;
        /*pointer*/
        thisCartProduct.price =
          thisCartProduct.amount * thisCartProduct.priceSingle;
        thisCartProduct.dom.price.innerHTML = thisCartProduct.price;
      });
    }
    remove() {
      const thisCartProduct = this;
      const event = new CustomEvent('remove', {
        bubbles: true,
        detail: {
          cartProduct: thisCartProduct,
        },
      });

      thisCartProduct.dom.wrapper.dispatchEvent(event);
      console.log('remove');
    }
    initActions() {
      const thisCartProduct = this;
      thisCartProduct.dom.edit.addEventListener('click', function () {});
      thisCartProduct.dom.remove.addEventListener('click', function () {
        thisCartProduct.remove();
      });
    }
    getData() {
      const thisCartProduct = this;
      const priceSingle = thisCartProduct.priceSingle;
      const price = priceSingle * thisCartProduct.amountWidget.value;
      const cartProductSummary = {
        params: thisCartProduct.params,
        id: thisCartProduct.id,
        name: thisCartProduct.name,
        amount: thisCartProduct.amount,
        priceSingle: priceSingle,
        price: price,
      };
      console.log('summary:', cartProductSummary);
      return cartProductSummary;
    }
  }

  const app = {
    initMenu: function () {
      const thisApp = this;

      for (let productData in thisApp.data.products) {
        new Product(
          thisApp.data.products[productData].id,
          thisApp.data.products[productData]
        );
      }
    },
    initData: function () {
      const thisApp = this;
      thisApp.data = [];
      const url = settings.db.url + '/' + settings.db.products;
      fetch(url)
        .then(function (rawResponse) {
          return rawResponse.json();
        })
        .then(function (parsedResponse) {
          console.log('parsedResponse:', parsedResponse);
          /*save parsedresponse as thisApp.data.products */
          thisApp.data.products = parsedResponse;
          /* execute initMenu method */
          thisApp.initMenu();
        });
      console.log('thisApp.data: ', JSON.stringify(thisApp.data));
    },
    init: function () {
      const thisApp = this;
      console.log('*** App starting ***');
      console.log('thisApp:', thisApp);
      console.log('classNames:', classNames);
      console.log('settings:', settings);
      console.log('templates:', templates);
      thisApp.initData();
      thisApp.initCart();
    },
    initCart: function () {
      const thisApp = this;
      const cartElem = document.querySelector(select.containerOf.cart);
      thisApp.cart = new Cart(cartElem);
    },
  };

  app.init();
}
