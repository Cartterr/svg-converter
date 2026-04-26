$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$target = Join-Path $repoRoot 'third_party\star-vector\starvector\model\llm\starcoder.py'

if (-not (Test-Path -LiteralPath $target)) {
  throw "Missing StarVector source at $target"
}

$content = Get-Content -LiteralPath $target -Raw
if ($content.Contains('GPTBigCodeConfig') -and $content.Contains('GPTBigCodeForCausalLM(config=model_config)')) {
  Write-Host 'StarVector offline Windows patch already applied.'
  exit 0
}

$content = $content.Replace('    AutoConfig, ' + "`r`n", '')
$content = $content.Replace(
  '    AutoTokenizer,' + "`r`n" + '    utils',
  '    AutoTokenizer,' + "`r`n" + '    GPTBigCodeConfig,' + "`r`n" + '    GPTBigCodeForCausalLM,' + "`r`n" + '    utils'
)
$content = $content.Replace(
  '        self.init_tokenizer(config.starcoder_model_name)',
  '        tokenizer_source = getattr(config, "name_or_path", None) or getattr(config, "_name_or_path", None) or config.starcoder_model_name' + "`r`n" + '        self.init_tokenizer(tokenizer_source)'
)
$content = $content.Replace(
  '        model_config = AutoConfig.from_pretrained(config.starcoder_model_name, trust_remote_code=True)',
  @'
        model_config = GPTBigCodeConfig(
            vocab_size=config.vocab_size,
            n_positions=config.max_position_embeddings,
            n_embd=config.hidden_size,
            n_layer=config.num_hidden_layers,
            n_head=config.num_attention_heads,
            multi_query=config.multi_query,
            use_cache=config.use_cache,
        )
'@.TrimEnd()
)
$content = $content.Replace(
  '        # model = GPTBigCodeForCausalLM(config=model_config)' + "`r`n" + '        model = AutoModelForCausalLM.from_pretrained(config.starcoder_model_name, config=model_config, **kwargs)',
  '        model = GPTBigCodeForCausalLM(config=model_config)'
)

Set-Content -LiteralPath $target -Value $content -NoNewline
Write-Host 'Applied StarVector offline Windows patch.'
