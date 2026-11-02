;(function () {
  // Step 1: Collect all font sizes and associated elements
  const fontSizeMap = new Map()
  const elementsMap = new Map()

  // Traverse through all DOM elements
  document.querySelectorAll('*').forEach((element) => {
    const computedStyle = window.getComputedStyle(element)
    const fontSize = computedStyle.fontSize

    // Count occurrences of each font size
    if (fontSizeMap.has(fontSize)) {
      fontSizeMap.set(fontSize, fontSizeMap.get(fontSize) + 1)
    } else {
      fontSizeMap.set(fontSize, 1)
    }

    // Store elements associated with each font size
    if (!elementsMap.has(fontSize)) {
      elementsMap.set(fontSize, [])
    }
    elementsMap.get(fontSize).push(element)
  })

  // Step 2: Find the most common font sizes
  const sortedFontSizes = Array.from(fontSizeMap.entries()).sort((a, b) => b[1] - a[1])
  const mostCommonFontSize = sortedFontSizes.length > 0 ? sortedFontSizes[0][0] : null

  // Step 3: Identify outliers
  const totalElements = Array.from(fontSizeMap.values()).reduce((a, b) => a + b, 0)
  const threshold = 0.1 * totalElements // Set a threshold for outlier detection (10% of elements)
  const outlierSizes = sortedFontSizes
    .filter(([, count]) => count < threshold)
    .map(([fontSize]) => fontSize)

  // Step 4: Generate a report of outliers and their selectors
  const report = []
  outlierSizes.forEach((outlierSize) => {
    const elements = elementsMap.get(outlierSize) || []
    elements.forEach((element) => {
      const selector = getUniqueSelector(element)
      const htmlContent = element.outerHTML.trim().replace(/\s+/g, ' ').substring(0, 100) // Extract first 100 chars of HTML
      report.push({ fontSize: outlierSize, selector, htmlContent })
    })
  })

  // Step 5: Output the results
  console.log('Most Common Font Size:', mostCommonFontSize)
  console.log('Font Outliers:')
  console.table(report)

  // Helper function: Generate a unique CSS selector for an element
  function getUniqueSelector(element) {
    if (element.id) {
      return `#${element.id}`
    }

    let path = ''
    while (element) {
      let name = element.localName
      if (!name) break

      name = name.toLowerCase()
      let parent = element.parentNode

      if (parent) {
        const sameTagSiblings = Array.from(parent.children).filter((e) => e.localName === name)
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(element)
          name += `:nth-of-type(${index + 1})`
        }
      }

      path = `${name} > ${path}`
      element = parent
    }

    return path.slice(0, -3)
  }
})()
