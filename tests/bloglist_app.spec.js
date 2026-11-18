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

  describe('Login', () => {
    beforeEach(async ({ page }) => {
      await page.getByRole('link', { name: 'login' }).click()
    })
    test('succeeds with correct credentials', async ({ page }) => {
      await loginWith(page, 'serroal', 'password')

      await expect(page.getByRole('button', { name: 'logout' })).toBeVisible()
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
      await page.getByRole('link', { name: 'login' }).click()
      await loginWith(page, 'serroal', 'password')
    })

    test('a new blog can be created', async ({ page }) => {
      await createBlog(page, 'This is a test blog', 'Jhon Doe', 'http://testblog.com')

      const successDiv = page.locator('.success')  
      await expect(successDiv).toContainText('a new blog This is a test blog by Jhon Doe added', { exact: true })
      await expect(page.getByText('This is a test blog by Jhon Doe', { exact: true })).toBeVisible()
    })

    describe('and several blogs exists', () => {    
      beforeEach(async ({ page }) => {
        await createBlog(page, 'This is a test blog', 'Jhon Doe', 'http://testblog.com')
        await createBlog(page, 'This is another test blog', 'Jane Doe', 'http://anothertestblog.com')    
      })

      test('one of those can be liked', async ({ page }) => {
        await page.getByRole('link', { name: 'This is a test blog by Jhon Doe' }).click()

        const likesElement = page.getByText('likes 0')
        await likesElement.getByRole('button', { name: 'like' }).click()

        await expect(page.getByText('likes 1')).toBeVisible()
      })

      test('one of those can be deleted', async ({ page }) => {
        await page.getByRole('link', { name: 'This is a test blog by Jhon Doe' }).click()
        
        page.on('dialog', dialog => dialog.accept())
        await page.getByRole('button', { name: 'remove' }).click()

        await expect(page.getByRole('link', { name: 'This is a test blog by Jhon Doe' })).not.toBeVisible()
      })

      test('only user who created the blog sees the remove button', async ({ page }) => {
        await page.getByRole('button', { name: 'logout' }).click()
        await page.getByRole('link', { name: 'login' }).click()
        await loginWith(page, 'testuser', 'password')
        await page.getByRole('link', { name: 'This is a test blog by Jhon Doe' }).click()
        
        await expect(page.getByRole('button', { name: 'remove' })).not.toBeVisible()
      })

      test('blogs are ordered by likes', async ({ page }) => {
        const firstBlog = page.getByRole('listitem').first()
        await expect(firstBlog).toContainText('This is a test blog by Jhon Doe')

        await page.getByRole('link', { name: 'This is another test blog by Jane Doe' }).click()
        await page.getByRole('button', { name: 'like' }).click()

        await page.getByText('blogs').click()
        const newFirstBlog = page.getByRole('listitem').first()
        await expect(newFirstBlog).toContainText('This is another test blog by Jane Doe')
      })
    })
  })
})