import os,glob
here=os.path.dirname(os.path.abspath(__file__))
prelude=open(f'{here}/prelude.txt').read().rstrip('\n')
reportt=open(f'{here}/report.txt').read().rstrip('\n')
for f in glob.glob(f'{here}/*.ts'):
    name=os.path.basename(f)[:-3]
    pre=prelude.replace('Codemod, SgNode','Codemod, Rule, SgNode') if 'Rule<TSX>' in open(f).read() else prelude
    s=open(f).read().replace('__PRELUDE__',pre).replace('__REPORT__',reportt).replace('__NAME__',name)
    open(f'{here}/../codemods/{name}/scripts/codemod.ts','w').write(s)
    print('built',name)
