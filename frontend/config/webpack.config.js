module: {
    rules: [
      {
        test: /\.(woff|woff2)$/,
        type: 'asset/resource',
        generator: {
          filename: 'static/media/[name][ext]'
        }
      }
    ]
  }