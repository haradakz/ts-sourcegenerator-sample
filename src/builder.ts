import * as ts from 'typescript';

export default class BasicSourceCreater {
    private _importList: [ { moduleName: string, entries: string[] } ];
    private _propertyMap: {[name: string]: { comment: string, array: boolean, type: string } };
    constructor(private readonly _inputdata: string[][], private readonly _fileName: string){
        this._propertyMap = {};
    }
    public execute(): string{
        let members: ts.ClassElement[] = [];
        members = members.concat(this.createPropertise());
        members = members.concat(this.createInitializer());
        members = members.concat(this.createMethod3());

        const target = this._inputdata.filter(v => v[0] === '0');
        const [datahader, name, comment, baseClassName, baseClassModule, typedClassName, typedClassModule] = target[0];

        const statements = [];
        const clazz = this.createClass(name, comment, members, baseClassName, baseClassModule, typedClassName, typedClassModule)
        if(this._importList){
            this._importList.forEach(v => {
                statements.push(this.createImportStatement(v.entries, v.moduleName))
            });
        }
        statements.push(clazz);

        const source = ts.createSourceFile(this._fileName, "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
        const ast = ts.updateSourceFileNode(source, statements);
        const result = ts.createPrinter().printNode(ts.EmitHint.Unspecified, ast, source);
    
        return result;
    }

    protected createInitializer(){
        const methodMap: {[name: string]: ts.ExpressionStatement[]} = {};
        const target = this._inputdata.filter(v => v[0] === '2');
        target.forEach(v => {
            const [datahader, methodName, name, initValue] = v;
            const key = methodName === 'constructor' ? "$_constructor" : methodName;
            let list = methodMap[key];
            if(!list){
                methodMap[key] = list = [];
                if(key === "$_constructor"){
                    list.push(
                        ts.createExpressionStatement(ts.createCall(
                            ts.createSuper(),
                            undefined,
                            []
                        ))
                    );
                }
            }
            const propInfo = this._propertyMap[name];
            let type = propInfo.type;
            if(initValue === 'null'){
                type = 'null';
            }else if(propInfo.array){
                type = 'array';
            }
            list.push(this.createSetPropertyValue(name, initValue, type));
        });

        const result = [];
        for(const k of Object.keys(methodMap)) {
            const d = methodMap[k];
            const block = ts.createBlock(d, true);
            if(k === "$_constructor"){
                result.push(ts.createConstructor(
                            undefined,
                            undefined,
                            [],
                            block));
            }else{
                result.push(ts.createMethod(
                            undefined,
                            [ts.createModifier(ts.SyntaxKind.PublicKeyword)],
                            undefined,
                            ts.createIdentifier(k),
                            undefined,
                            undefined,
                            [],
                            undefined,
                            block));
            }
        }
        return result;
    }

    protected createSetPropertyValue(name: string, value: string, type: string){
        return ts.createExpressionStatement(ts.createBinary(
            ts.createPropertyAccess(
              ts.createThis(),
              ts.createIdentifier(name)
            ),
            ts.createToken(ts.SyntaxKind.EqualsToken),
            this.createLiteral(value, type)
          ))
    }

    protected createLiteral(value: string, type: string): ts.Expression{
        let literal: ts.Expression;
        switch(type){
            case "string":
                if(value){
                    literal = ts.createStringLiteral(value);
                }else{
                    literal = ts.createStringLiteral('');
                }
                break;
            case "number":
                if(value){
                    literal = ts.createNumericLiteral(value);
                }else{
                    literal = ts.createNumericLiteral('0');
                }
                break;
            case "boolean":
                if(value === "true"){
                    literal = ts.createTrue();
                }else{
                    literal = ts.createFalse();
                }
                break;
            case "array":
                literal = ts.createArrayLiteral();
                break;    
            case "null":
            default:
                literal = ts.createNull();
        }
        return literal;
    }

    protected addImports(typeName:string, moduleName: string){
        if(!this._importList){
            this._importList = [{ moduleName: moduleName, entries: [] }];
        }
        for(let v of this._importList){
            if(v.moduleName === moduleName){
                if(v.entries.indexOf(typeName) == -1){
                    v.entries.push(typeName);
                }
                return;
            }
        }
        this._importList.push({ moduleName: moduleName, entries: [typeName] });
    }
    protected createPropertise(): ts.PropertyDeclaration[]{
        const target = this._inputdata.filter(v => v[0] === '1');
        const result = [];
        target.forEach(v => {
            const [datahader, modifier, name, comment, array, typeName, moduleName] = v;
            const isArray = array === 'true' ? true : false;
            this._propertyMap[name] = { comment: comment, array: isArray, type: typeName };
            result.push(this.createProperty(modifier, name, comment, isArray, typeName, moduleName));
        });
        return result;
    }
    protected createMethod3(): ts.MethodDeclaration[]{
        const methodMap: {[name: string]: ts.ObjectLiteralElementLike[]} = {};
        const target = this._inputdata.filter(v => v[0] === '3');
        target.forEach(v => {
            const [datahader, methodName, name, initValue] = v;
            let list = methodMap[methodName];
            if(!list){
                methodMap[methodName] = list = [];
            }
            const propInfo = this._propertyMap[name];
            let type = propInfo.type;
            if(initValue === 'null'){
                type = 'null';
            }else if(propInfo.array){
                type = 'array';
            }
            list.push(this.createPropertyAssignment(name, initValue, type))
        });
        const result = [];
        for(const k of Object.keys(methodMap)) {
            const d = methodMap[k];
            const objLiteral = this.createObjectLiteral(d);
            result.push(this.createMethodReternObjectLiteral(k, objLiteral));
        }
        return result;
    }
    protected createProperty(modifier: string, name: string, comment: string, array: boolean, type: string, moduleName?: string){
        if(moduleName){
            this.addImports(type, moduleName);
        }
        let modifierType = ts.SyntaxKind.PublicKeyword;
        switch(modifier){
            case "private":
                modifierType = ts.SyntaxKind.PrivateKeyword;
                break;
            case "protected":
                modifierType = ts.SyntaxKind.ProtectedKeyword;
                break;
        }
        let typeNode: ts.TypeNode;
        typeNode = ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
        if(type){
            switch(type){
                case "string":
                    typeNode = ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
                    break;
                case "number":
                    typeNode = ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
                    break;
                case "boolean":
                    typeNode = ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
                    break;
                default:
                    typeNode = ts.createTypeReferenceNode(ts.createIdentifier(type), undefined);
            }
        }
        if(array){
            typeNode = ts.createArrayTypeNode(typeNode);
        }
        let node = ts.createProperty(
            undefined,
            [
                ts.createModifier(modifierType)
            ],
            ts.createIdentifier(name),
            undefined,
            typeNode,
            undefined
        );
        if(comment){
            ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, comment, true);
        }
        return node;
    }

    protected createPropertyAssignment(name: string, value: string, type: string): ts.ObjectLiteralElementLike{
        const literal = this.createLiteral(value, type);
        return ts.createPropertyAssignment(
                    ts.createIdentifier(name),
                    literal
        );
    }
    
    protected createObjectLiteral(properties: ts.ObjectLiteralElementLike[]){
        return ts.createObjectLiteral(
            properties,
            true
        );
    }
    
    protected createMethodReternObjectLiteral(name: string, objectLiteral: ts.ObjectLiteralExpression){
        return ts.createMethod(
            undefined,
            [ts.createModifier(ts.SyntaxKind.PublicKeyword)],
            undefined,
            ts.createIdentifier(name),
            undefined,
            undefined,
            [],
            ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
            ts.createBlock(
              [
                  ts.createReturn(objectLiteral)
              ],
              true
            )
        );
    }
    protected createImportStatement(names: string[], moduleName: string): ts.ImportDeclaration {
        return ts.createImportDeclaration(
            undefined, 
            undefined, 
            ts.createImportClause(
                undefined, 
                ts.createNamedImports(
                    names.map((n) => {
                        return ts.createImportSpecifier(
                            undefined,
                            ts.createIdentifier(n)
                          )
                    })
                )
            ),
            ts.createStringLiteral(moduleName)
        );
    }        
    protected createClass(name: string, comment: string, members: ts.ClassElement[], extendClassName?: string, extendClassModule?: string, typeRefName?: string, typeRefModule?: string){
        let heritageClause: ts.HeritageClause[];
        if(extendClassName){
            if(extendClassModule){
                this.addImports(extendClassName, extendClassModule);
            }
            if(typeRefName){
                if(typeRefModule){
                    this.addImports(typeRefName, typeRefModule);
                }
                heritageClause = [ts.createHeritageClause(
                    ts.SyntaxKind.ExtendsKeyword,
                    [ts.createExpressionWithTypeArguments(
                      [ts.createTypeReferenceNode(
                        ts.createIdentifier(typeRefName),
                        undefined
                      )],
                      ts.createIdentifier(extendClassName)
                    )]
                  )];
            }else{
                heritageClause = [ts.createHeritageClause(
                    ts.SyntaxKind.ExtendsKeyword,
                    [ts.createExpressionWithTypeArguments(
                      undefined,
                      ts.createIdentifier(extendClassName)
                    )]
                  )];
            }
        }
        let node = ts.createClassDeclaration(
            undefined,
            [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
            ts.createIdentifier(name),
            undefined,
            heritageClause,
            members
        );
        if(comment){
            ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, comment, true);
        }
        return node;
    }    
}
