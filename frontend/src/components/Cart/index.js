import Header from '../Header'
import CartContext from '../../context/CartContext'
import {AiFillCloseCircle} from 'react-icons/ai'
import {BsPlusSquare, BsDashSquare} from 'react-icons/bs'
import './index.css'

const Cart = () => (
  <CartContext.Consumer>
    {value => {
      const {
        cartList,
        removeAllCartItems,
        removeCartItem,
        incrementCartItemQuantity,
        decrementCartItemQuantity,
      } = value

      const showEmptyCart = cartList.length === 0

      const calculateCartTotal = () => {
        let total = 0
        cartList.forEach(eachItem => {
          total += eachItem.price * eachItem.quantity
        })
        return total
      }

      return (
        <>
          <Header />
          <div className="cart-container">
            {showEmptyCart ? (
              <div className="empty-cart-container">
                <img
                  src="https://assets.ccbp.in/frontend/react-js/nxt-trendz-cart-img.png"
                  alt="cart"
                  className="cart-img"
                />
                <h1 className="empty-cart-heading">Your Cart Is Empty</h1>
              </div>
            ) : (
              <div className="cart-content-container">
                <div className="cart-header-container">
                  <h1 className="cart-my-cart-heading">My Cart</h1>
                  <button
                    type="button"
                    className="remove-all-btn"
                    onClick={removeAllCartItems}
                  >
                    Remove All
                  </button>
                </div>
                
                <ul className="cart-list">
                  {cartList.map(eachItem => {
                    const {id, title, brand, quantity, price, imageUrl} = eachItem
                    
                    const onRemoveCartItem = () => {
                      removeCartItem(id)
                    }
                    const onIncrement = () => {
                      incrementCartItemQuantity(id)
                    }
                    const onDecrement = () => {
                      decrementCartItemQuantity(id)
                    }

                    return (
                      <li className="cart-item-container" key={id}>
                        <img className="cart-item-image" src={imageUrl} alt={title} />
                        <div className="cart-item-details-container">
                          <div className="cart-item-title-brand-container">
                            <p className="cart-item-title">{title}</p>
                            <p className="cart-item-brand">by {brand}</p>
                          </div>
                          
                          <div className="cart-item-quantity-container">
                            <button
                              type="button"
                              className="quantity-btn"
                              onClick={onDecrement}
                              data-testid="decrement"
                            >
                              <BsDashSquare className="quantity-icon" />
                            </button>
                            <p className="cart-item-quantity">{quantity}</p>
                            <button
                              type="button"
                              className="quantity-btn"
                              onClick={onIncrement}
                              data-testid="increment"
                            >
                              <BsPlusSquare className="quantity-icon" />
                            </button>
                          </div>
                          
                          <div className="cart-item-price-remove-container">
                            <p className="cart-item-total-price">Rs {price * quantity}/-</p>
                            <button
                              type="button"
                              className="remove-btn"
                              onClick={onRemoveCartItem}
                              data-testid="remove"
                            >
                              <AiFillCloseCircle className="remove-icon" />
                            </button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                <div className="cart-summary-container">
                  <h1 className="order-total-heading">
                    Order Total: <span className="order-total-price">Rs {calculateCartTotal()}/-</span>
                  </h1>
                  <p className="items-count-text">{cartList.length} Items in cart</p>
                  <button type="button" className="checkout-btn">
                    Checkout
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )
    }}
  </CartContext.Consumer>
)

export default Cart
