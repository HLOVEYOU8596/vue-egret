/** 虚拟树 */
import { ASTNode, ASTAttr } from './ast-node'
import { ForParseResult } from '../helpers';

const BIND_REG:RegExp = /^(v-bind:|:)/
const ON_REG:RegExp = /^(v-on:|@)/
const TEXT_REG:RegExp = /\{\{([^}]+)\}\}/g

const fnExpRE = /^([\w$_]+|\([^)]*?\))\s*=>|^function(?:\s+[\w$]+)?\s*\(/
const simplePathRE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/
    
export interface Variate {
    [varName:string] :string,
}

export interface VNode {
    sp?: egret.DisplayObject;
    tag: string;
    children: Array<VNode>;
    attrs: {
        [propsName:string]: any
    };
    on: {
        [eventType:string]: Function
    };
}

export function genAttr(ast: ASTNode):string {
    let attrs = '', on = '';
    ast.attrsList.forEach((attr:ASTAttr) => {
        if(BIND_REG.test(attr.name)){
            attrs += `"${attr.name.replace(BIND_REG,'')}":_n(${attr.value}),`
        }else if(ON_REG.test(attr.name)){
            on += `"${attr.name.replace(ON_REG,'')}":${genHandler(attr.value)},`
        }else{
            attrs += `"${attr.name}":_n("${attr.value}"),`
        }
    })
    if(ast.text){
        attrs += `text:${genText(ast)},`
    }
    return `{attrs:{${attrs}},on:{${on}}}`;
}

export function genText(ast: ASTNode):string {
    return `_s("${ast.text.replace(TEXT_REG, (_:any, expOrFn:string) => `"+(${expOrFn})+"`)}")`
}

export function genHandler(exp:string):string {
    if(simplePathRE.test(exp) || fnExpRE.test(exp)){
        return exp;
    }
    return `function($event){${exp}}`
}

export function genVNode(ast: ASTNode, isCheck:boolean=true):string {
    const forRes:ForParseResult = ast.processMap.for
    if(isCheck && forRes && forRes.for){
        return `_l((${forRes.for}), function(${[forRes.alias,forRes.iterator1,forRes.iterator2].filter(Boolean).join(',')}){return ${genVNode(ast, false)}})`
    }else if(isCheck && ast.processMap.ifConditions){
        return '(' + ast.processMap.ifConditions.map(({exp, target}:{exp:string, target:ASTNode}) => `${exp}?${genVNode(target, false)}:`).join('') + '"")';
    }else{
        return `_c("${ast.tag}", ${genAttr(ast)}, [].concat(${ast.children.map((ast:ASTNode) => genVNode(ast)).join(',')}))`;
    }
}

export function createVNode(tag:string, data:any, children:Array<VNode>):VNode {
    let vnode:VNode = {
        tag,
        children,
        attrs: data.attrs,
        on: data.on,
    }
    return vnode;
}