import {Component} from 'react'
import Cookies from 'js-cookie'
import {Redirect} from 'react-router-dom'
import './index.css'

class LoginForm extends Component {
  state = {
    username: '',
    email: '',
    password: '',
    isSignUp: false,
    showSubmitError: false,
    errorMsg: '',
    successMsg: '',
  }

  onChangeUsername = event => {
    this.setState({username: event.target.value, showSubmitError: false, successMsg: ''})
  }

  onChangeEmail = event => {
    this.setState({email: event.target.value, showSubmitError: false, successMsg: ''})
  }

  onChangePassword = event => {
    this.setState({password: event.target.value, showSubmitError: false, successMsg: ''})
  }

  toggleFormMode = () => {
    this.setState(prevState => ({
      isSignUp: !prevState.isSignUp,
      showSubmitError: false,
      errorMsg: '',
      successMsg: '',
    }))
  }

  onSubmitSuccess = jwtToken => {
    const {history} = this.props

    Cookies.set('jwt_token', jwtToken, {
      expires: 30,
      path: '/',
    })
    history.replace('/')
  }

  onSubmitFailure = errorMsg => {
    this.setState({showSubmitError: true, errorMsg, successMsg: ''})
  }

  submitForm = async event => {
    event.preventDefault()
    const {username, email, password, isSignUp} = this.state

    if (!username || !password || (isSignUp && !email)) {
      this.onSubmitFailure('Please fill in all fields')
      return
    }

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'
    const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login'
    const url = `${backendUrl}${endpoint}`

    const userDetails = isSignUp
      ? {username, email, password}
      : {username, password}

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userDetails),
    }

    try {
      const response = await fetch(url, options)
      const data = await response.json()
      if (response.ok === true) {
        if (isSignUp) {
          this.setState({
            successMsg: 'Registration successful! You can now login.',
            isSignUp: false,
            password: '',
            email: '',
          })
        } else {
          this.onSubmitSuccess(data.jwt_token)
        }
      } else {
        this.onSubmitFailure(data.error_msg || 'Something went wrong')
      }
    } catch (error) {
      this.onSubmitFailure('Failed to connect to backend server. Is it running?')
    }
  }

  fillCredentials = (username, password) => {
    this.setState({
      username,
      password,
      showSubmitError: false,
      successMsg: '',
    }, () => {
      const mockEvent = { preventDefault: () => {} }
      this.submitForm(mockEvent)
    })
  }

  renderPasswordField = () => {
    const {password} = this.state
    return (
      <>
        <label className="input-label" htmlFor="password">
          PASSWORD
        </label>
        <input
          type="password"
          id="password"
          className="password-input-field"
          value={password}
          onChange={this.onChangePassword}
          placeholder="Enter Password"
        />
      </>
    )
  }

  renderUsernameField = () => {
    const {username} = this.state
    return (
      <>
        <label className="input-label" htmlFor="username">
          USERNAME
        </label>
        <input
          type="text"
          id="username"
          className="username-input-field"
          value={username}
          onChange={this.onChangeUsername}
          placeholder="Enter Username"
        />
      </>
    )
  }

  renderEmailField = () => {
    const {email} = this.state
    return (
      <>
        <label className="input-label" htmlFor="email">
          EMAIL
        </label>
        <input
          type="email"
          id="email"
          className="username-input-field"
          value={email}
          onChange={this.onChangeEmail}
          placeholder="Enter Email"
        />
      </>
    )
  }

  render() {
    const {showSubmitError, errorMsg, successMsg, isSignUp} = this.state
    const jwtToken = Cookies.get('jwt_token')
    if (jwtToken !== undefined) {
      return <Redirect to="/" />
    }
    return (
      <div className="login-form-container">
        <img
          src="https://assets.ccbp.in/frontend/react-js/nxt-trendz-logo-img.png"
          className="login-website-logo-mobile-image"
          alt="website logo"
        />
        <img
          src="https://assets.ccbp.in/frontend/react-js/nxt-trendz-login-img.png"
          className="login-image"
          alt="website login"
        />
        <form className="form-container" onSubmit={this.submitForm}>
          <img
            src="https://assets.ccbp.in/frontend/react-js/nxt-trendz-logo-img.png"
            className="login-website-logo-desktop-image"
            alt="website logo"
          />
          <div className="input-container">{this.renderUsernameField()}</div>
          {isSignUp && (
            <div className="input-container">{this.renderEmailField()}</div>
          )}
          <div className="input-container">{this.renderPasswordField()}</div>
          <button type="submit" className="login-button">
            {isSignUp ? 'Sign Up' : 'Login'}
          </button>
          
          <button 
            type="button" 
            className="toggle-mode-btn"
            onClick={this.toggleFormMode}
          >
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>

          {showSubmitError && <p className="error-message">*{errorMsg}</p>}
          {successMsg && <p className="success-message">{successMsg}</p>}

          {!isSignUp && (
            <div className="demo-credentials-container">
              <p className="demo-credentials-heading">Quick Login for Recruiters</p>
              <div className="demo-btn-group">
                <button
                  type="button"
                  className="demo-credential-btn admin-btn"
                  onClick={() => this.fillCredentials('admin', 'admin123')}
                >
                  <span className="demo-role admin-role">Admin (Local Bypass)</span>
                  <span className="demo-username">admin | admin123</span>
                </button>
                <button
                  type="button"
                  className="demo-credential-btn"
                  onClick={() => this.fillCredentials('rahul', 'rahul@2021')}
                >
                  <span className="demo-role">Prime User</span>
                  <span className="demo-username">rahul | rahul@2021</span>
                </button>
                <button
                  type="button"
                  className="demo-credential-btn"
                  onClick={() => this.fillCredentials('raja', 'raja@2021')}
                >
                  <span className="demo-role">Non-Prime User</span>
                  <span className="demo-username">raja | raja@2021</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    )
  }
}

export default LoginForm
