// Modules that the Vite plugins in tools/ make during the build.

declare module 'virtual:build-info' {
  /** See BuildInfo in tools/buildInfo.ts. */
  const info: {
    readonly commit: string | null
    readonly modified: boolean
    readonly builtAt: string
    readonly ciRun: {
      readonly url: string
      readonly workflow: string
      readonly number: string
      readonly attempt: string
    } | null
  }
  export default info
}

declare module 'virtual:licenses' {
  /** See ThirdParty in tools/licenses.ts. */
  const packages: readonly {
    readonly name: string
    readonly version: string
    readonly license: string
    readonly homepage: string | null
    readonly text: string
    readonly notice: string | null
  }[]
  export default packages
}
