const { test, expect, beforeEach, describe } = require('@playwright/test')
const { loginWith, createBlog } = require('./helper')

describe('Blog app', () => {
  beforeEach(async ({ page, request }) => {
    await request.post('/api/testing/reset')
    await request.post('/api/users', {
      data: {
        name: 'Sergio R',
        username: 'serroal',
        password: 'password'
      }
    })
    await request.post('/api/users', {
      data: {
        name: 'test user',
        username: 'testuser',
        password: 'password'
      }
    })

    await page.goto('/')
  })

  test('Login form is shown', async ({ page }) => {
    const locator = page.getByText('Log in to application')
    await expect(locator).toBeVisible()
  })

  describe('Login', () => {
    test('succeeds with correct credentials', async ({ page }) => {
      await loginWith(page, 'serroal', 'password')

      await expect(page.getByText('Sergio R logged in')).toBeVisible()
    })

    test('fails with wrong credentials', async ({ page }) => {
      await loginWith(page, 'serroal', 'wrong')

      const errorDiv = page.locator('.error')  
      await expect(errorDiv).toContainText('wrong username or password')
      await expect(errorDiv).toHaveCSS('border-style', 'solid')
      await expect(errorDiv).toHaveCSS('color', 'rgb(255, 0, 0)')
    })
  })

  describe('When logged in', () => {
    beforeEach(async ({ page }) => {
      await loginWith(page, 'serroal', 'password')
    })

    test('a new blog can be created', async ({ page }) => {
      await createBlog(page, 'This is a test blog', 'Jhon Doe', 'http://testblog.com')

      const successDiv = page.locator('.success')  
      await expect(successDiv).toContainText('a new blog This is a test blog by Jhon Doe added')
      await expect(page.getByText('This is a test blog Jhon Doe')).toBeVisible()
    })

    describe('and several blogs exists', () => {    
      beforeEach(async ({ page }) => {
        await createBlog(page, 'This is a test blog', 'Jhon Doe', 'http://testblog.com')
        await createBlog(page, 'This is another test blog', 'Jane Doe', 'http://anothertestblog.com')    
      })

      test('one of those can be liked', async ({ page }) => {
        const blogElement = page.getByText('This is a test blog Jhon Doe').locator('..')
        await blogElement.getByRole('button', { name: 'show' }).click()

        const likesElement = page.getByText('likes 0')
        await likesElement.getByRole('button', { name: 'like' }).click()

        await expect(page.getByText('likes 1')).toBeVisible()
      })

      test('one of those can be deleted', async ({ page }) => {
        const blogElement = page.getByText('This is a test blog Jhon Doe').locator('..')
        await blogElement.getByRole('button', { name: 'show' }).click()
        
        page.getByRole('button', { name: 'remove' }).click()

        page.on('dialog', dialog => dialog.accept())

        await expect(page.getByText('This is a test blog Jhon Doe')).not.toBeVisible()
      })

      test('only user who created the blog sees the remove button', async ({ page }) => {
        await page.getByRole('button', { name: 'logout' }).click()
        await loginWith(page, 'testuser', 'password')
        const blogElement = page.getByText('This is a test blog Jhon Doe').locator('..')
        await blogElement.getByRole('button', { name: 'show' }).click()
        
        await expect(page.getByRole('button', { name: 'remove' })).not.toBeVisible()
      })
    })
  })
})